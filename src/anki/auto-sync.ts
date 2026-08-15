// Anki 自动同步模块
// 后台检测 AnkiConnect，自动导出新词

import type StudyLoop from "@/main";
import { isAnkiConnectAvailable, addNote, createDeck, getDeckNames } from "./anki-connect";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 分钟
const DEFAULT_DECK = "StudyLoop";
const DEFAULT_MODEL = "Basic";

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

            // 获取待导出的词（ankiNoteId 为 null 且 status > 0）
            const words = this.plugin.wordStore.getAllWords().filter(
                w => w.ankiNoteId === null && w.status > 0,
            );

            if (words.length === 0) return;

            // 确保默认牌组存在
            const decks = await getDeckNames();
            if (!decks.includes(DEFAULT_DECK)) {
                await createDeck(DEFAULT_DECK);
            }

            // 逐词导出
            for (const word of words) {
                try {
                    const front = word.expression;
                    const back = word.meaning +
                        (word.sentences.length > 0
                            ? "\n\n<hr>\n" + word.sentences.map(s => s.text).join("<br>")
                            : "");

                    const noteId = await addNote({
                        deckName: DEFAULT_DECK,
                        modelName: DEFAULT_MODEL,
                        fields: { Front: front, Back: back },
                        tags: ["StudyLoop", ...word.tags],
                    });

                    // 回写 ankiNoteId
                    this.plugin.wordStore.updateWord(word.expression, { ankiNoteId: noteId });
                } catch {
                    // 单个词失败不影响其他词
                    continue;
                }
            }
        } catch {
            // AnkiConnect 不可用，静默跳过
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