import { Notice } from "obsidian";
import type StudyLoop from "@/main";

export interface Word {
    expression: string;
    meaning: string;
    phonetic: string;
    pos: string;
    status: number; // 0=ignore, 1=learning, 2=familiar, 3=known, 4=learned
    t: "WORD" | "PHRASE";
    language: string;
    tags: string[];
    notes: string[];
    sentences: Sentence[];
    date: number;
    mastery: number;
    mdLink: string | null;
    exposures: number;
    lastExposure: string | null;
    exposureHistory: ExposureDay[];
    fsrs: FsrsCard;
    ankiNoteId: number | null;
}

export interface Sentence {
    text: string;
    trans: string;
    origin: string;
}

export interface ExposureDay {
    date: string;
    count: number;
}

export interface FsrsCard {
    due: string;
    stability: number;
    difficulty: number;
    state: number;
    reps: number;
    lapses: number;
    lastReview: string | null;
    interval?: number;
    consecutiveGood?: number;
}

export interface ReviewLog {
    word: string;
    rating: number;
    date: number;
    elapsedDays: number;
    scheduledDays: number;
}

export interface TranslationCacheEntry {
    hash: string;
    original: string;
    translated: string;
    backend: string;
    targetLang: string;
    useCount: number;
}

export interface TranslationCache {
    version: number;
    entries: Record<string, TranslationCacheEntry>;
    lruSize: number;
}

export interface ReviewStreak {
    current: number;
    best: number;
    lastCheckIn: string | null;
    history: string[];
}

export interface WordDb {
    version: number;
    words: Word[];
    reviewLog: ReviewLog[];
    reviewStreak: ReviewStreak;
    translationCache: TranslationCache;
    metadata: {
        totalWords: number;
        createdAt: string;
        lastSync: string;
    };
}

const DB_FILENAME = "worddb.json";

export class WordStore {
    private plugin: StudyLoop;
    private words: Map<string, Word> = new Map();
    private reviewLog: ReviewLog[] = [];
    private reviewStreak: ReviewStreak = { current: 0, best: 0, lastCheckIn: null, history: [] };
    private translationCache: TranslationCache = { version: 1, entries: {}, lruSize: 500 };
    private metadata = { totalWords: 0, createdAt: "", lastSync: "" };
    private saveTimer: number | null = null;
    private dirty = false;

    constructor(plugin: StudyLoop) {
        this.plugin = plugin;
    }

    async load(): Promise<void> {
        try {
            const raw = await this.plugin.loadData();
            if (!raw || !raw.worddb) {
                this.initializeEmpty();
                return;
            }
            const db = JSON.parse(raw.worddb) as WordDb;
            this.words.clear();
            for (const w of db.words || []) {
                this.words.set(w.expression, w);
            }
            this.reviewLog = db.reviewLog || [];
            this.reviewStreak = db.reviewStreak || { current: 0, best: 0, lastCheckIn: null, history: [] };
            this.translationCache = db.translationCache || { version: 1, entries: {}, lruSize: 500 };
            this.metadata = db.metadata || { totalWords: this.words.size, createdAt: new Date().toISOString(), lastSync: "" };
        } catch (e) {
            console.error("Failed to load worddb.json, starting fresh:", e);
            this.initializeEmpty();
        }
    }

    async save(): Promise<void> {
        if (!this.dirty) return;
        this.dirty = false;
        try {
            const db: WordDb = {
                version: 3,
                words: [...this.words.values()],
                reviewLog: this.reviewLog,
                reviewStreak: this.reviewStreak,
                translationCache: this.translationCache,
                metadata: {
                    ...this.metadata,
                    totalWords: this.words.size,
                    lastSync: new Date().toISOString(),
                },
            };
            await this.plugin.saveData({ worddb: JSON.stringify(db) });
        } catch (e) {
            console.error("Failed to save worddb.json:", e);
        }
    }

    markDirty(): void {
        this.dirty = true;
        if (this.saveTimer !== null) clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => this.save(), 500);
    }

    private initializeEmpty() {
        this.words.clear();
        this.reviewLog = [];
        this.reviewStreak = { current: 0, best: 0, lastCheckIn: null, history: [] };
        this.translationCache = { version: 1, entries: {}, lruSize: 500 };
        this.metadata = { totalWords: 0, createdAt: new Date().toISOString(), lastSync: "" };
    }

    getWord(expression: string): Word | undefined {
        return this.words.get(expression.toLowerCase());
    }

    hasWord(expression: string): boolean {
        return this.words.has(expression.toLowerCase());
    }

    getAllWords(): Word[] {
        return [...this.words.values()];
    }

    addWord(word: Word): void {
        this.words.set(word.expression.toLowerCase(), word);
        this.markDirty();
    }

    updateWord(expression: string, updates: Partial<Word>): void {
        const w = this.words.get(expression.toLowerCase());
        if (w) {
            Object.assign(w, updates);
            this.markDirty();
        }
    }

    removeWord(expression: string): void {
        this.words.delete(expression.toLowerCase());
        this.markDirty();
    }

    getDueWords(): Word[] {
        const today = new Date().toISOString().split("T")[0];
        return [...this.words.values()].filter(w => w.fsrs.due <= today);
    }

    getTodayStats(): { due: number; newWords: number; total: number } {
        const today = new Date().toISOString().split("T")[0];
        let due = 0;
        let newWords = 0;
        for (const w of this.words.values()) {
            if (w.fsrs.due <= today) due++;
            if (w.date && new Date(w.date * 1000).toISOString().split("T")[0] === today) newWords++;
        }
        return { due, newWords, total: this.words.size };
    }

    addReviewLog(log: ReviewLog): void {
        this.reviewLog.push(log);
        // 只保留最近 1000 条
        if (this.reviewLog.length > 1000) {
            this.reviewLog = this.reviewLog.slice(-1000);
        }
        this.markDirty();
    }

    incrementExposure(expression: string): void {
        const w = this.words.get(expression.toLowerCase());
        if (!w) return;
        w.exposures = (w.exposures || 0) + 1;
        const today = new Date().toISOString().split("T")[0];
        w.lastExposure = today;
        if (!w.exposureHistory) w.exposureHistory = [];
        const existing = w.exposureHistory.find(e => e.date === today);
        if (existing) {
            existing.count++;
        } else {
            w.exposureHistory.push({ date: today, count: 1 });
            // 只保留最近 30 天
            if (w.exposureHistory.length > 30) {
                w.exposureHistory = w.exposureHistory.slice(-30);
            }
        }
        this.markDirty();
    }
}