// Anki 自动同步模块（增强版：牌组映射 / MD→HTML / MD5 哈希缓存）

import type StudyLoop from "@/main";
import { isAnkiConnectAvailable, addNote, createDeck, getDeckNames, findNotes, updateNoteFields, getNotesInfo } from "./anki-connect";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 分钟
const DEFAULT_DECK = "StudyLoop";

/** 简易 MD→Anki HTML 转换（转义 HTML + 加粗 / 斜体 / 换行 / 列表） */
export function mdToHtml(text: string): string {
    if (!text) return "";
    // 先转义 HTML 防止 XSS
    let s = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    // 加粗 / 斜体
    s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
         .replace(/\*(.+?)\*/g, "<i>$1</i>");
    // 行内代码
    s = s.replace(/`(.+?)`/g, "<code>$1</code>");
    // 换行 → <br>
    s = s.replace(/\n/g, "<br>");
    // 短横线列表
    s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
    return s;
}

/** 计算简单 32-bit hash（用作内容变更检测） */
function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h = ((h << 5) - h) + c;
        h |= 0;
    }
    return Math.abs(h).toString(16);
}

/** 根据词 tag 推断 Anki 牌组 */
function resolveDeck(word: any, settings: StudyLoop["settings"]): string {
    if (settings.anki_enable_tag_mapping !== false && word.tags) {
        for (const tag of word.tags) {
            // 支持 #deck/xxx 或 deck:xxx 格式
            const m = tag.match(/^#?deck[/:](.+)$/);
            if (m) return m[1].trim();
        }
    }
    return settings.anki_deck || DEFAULT_DECK;
}

/** 构建 Anki 字段内容（前端 / 后端） */
function buildFields(word: any): { Front: string; Back: string } {
    const front = mdToHtml(word.expression || "");
    const parts: string[] = [];
    if (word.meaning) parts.push(mdToHtml(word.meaning));
    if (word.sentences && word.sentences.length > 0) {
        parts.push("<hr>" + word.sentences.map((s: any) => {
            const text = s.text ? `<em>${mdToHtml(s.text)}</em>` : "";
            const trans = s.trans ? ` — ${mdToHtml(s.trans)}` : "";
            return text + trans;
        }).join("<br>"));
    }
    if (word.notes && word.notes.length > 0) {
        parts.push("<strong>Notes:</strong><br>" + mdToHtml(word.notes.join("<br>")));
    }
    const back = parts.join("<br><br>");
    return { Front: front, Back: back };
}

/** 计算字段内容的哈希（用于跳过未变更词条） */
function computeAnkiHash(word: any): string {
    const { Front, Back } = buildFields(word);
    return simpleHash(Front + "|||" + Back);
}

export class AnkiAutoSync {
    private plugin: StudyLoop;
    private timer: number | null = null;
    private available = false;

    constructor(plugin: StudyLoop) {
        this.plugin = plugin;
    }

    /** 开始自动同步 */
    start() {
        this.checkAndSync();
        this.timer = window.setInterval(() => this.checkAndSync(), SYNC_INTERVAL);
    }

    /** 停止自动同步 */
    stop() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /** 检查并同步 */
    async checkAndSync() {
        try {
            this.available = await isAnkiConnectAvailable();
            if (!this.available) return;

            // 获取待导出的词（ankiNoteId 为 null 且 status > 0，或 hash 变更）
            const words = this.plugin.wordStore.getAllWords().filter(
                w => w.status > 0 && (w.ankiNoteId === null || w.ankiHash !== computeAnkiHash(w)),
            );

            if (words.length === 0) return;

            const decks = await getDeckNames();
            const defaultDeck = this.plugin.settings.anki_deck || DEFAULT_DECK;
            if (!decks.includes(defaultDeck)) {
                await createDeck(defaultDeck);
            }

            let added = 0;
            let updated = 0;
            for (const word of words) {
                try {
                    const deck = resolveDeck(word, this.plugin.settings);
                    if (!decks.includes(deck)) {
                        await createDeck(deck);
                    }
                    const fields = buildFields(word);
                    const newHash = computeAnkiHash(word);

                    if (word.ankiNoteId) {
                        // 已有笔记：比较 hash，差异时 update
                        const infoList = await getNotesInfo([word.ankiNoteId]);
                        const existing = infoList?.[0];
                        const existingFront = existing?.fields?.Front?.value || "";
                        const existingBack = existing?.fields?.Back?.value || "";
                        // 若前后端一致则跳过
                        if (existingFront === fields.Front && existingBack === fields.Back) {
                            continue;
                        }
                        await updateNoteFields({ id: word.ankiNoteId, fields });
                        // 回写 hash
                        this.plugin.wordStore.updateWord(word.expression, { ankiHash: newHash });
                        updated++;
                    } else {
                        // 新词：addNote
                        const noteId = await addNote({
                            deckName: deck,
                            modelName: "Basic",
                            fields,
                            tags: ["StudyLoop", ...(word.tags || [])],
                        });
                        this.plugin.wordStore.updateWord(word.expression, {
                            ankiNoteId: noteId,
                            ankiHash: newHash,
                        });
                        added++;
                    }
                } catch {
                    // 单个词失败不影响其他词
                    continue;
                }
            }
            if (added || updated) {
                console.debug(`[StudyLoop] Anki sync: +${added} / ~${updated}`);
            }
        } catch {
            this.available = false;
        }
    }

    /** 手动触发同步 */
    async syncNow(): Promise<number> {
        this.available = await isAnkiConnectAvailable();
        if (!this.available) return -1;
        const before = this.plugin.wordStore.getAllWords().filter(w => w.ankiNoteId === null && w.status > 0).length;
        await this.checkAndSync();
        const after = this.plugin.wordStore.getAllWords().filter(w => w.ankiNoteId === null && w.status > 0).length;
        return before - after;
    }
}