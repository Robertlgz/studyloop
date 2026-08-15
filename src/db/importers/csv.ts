// CSV 词典导入器
// 格式: word, definition (每行一个词条)

import type { Word } from "@/db/word-store";
import type StudyLoop from "@/main";

/** 从 CSV 文本导入到 StudyLoop 词库 */
export async function importFromCSV(plugin: StudyLoop, csvText: string): Promise<number> {
    const lines = csvText.split("\n").filter(l => l.trim());
    let count = 0;

    for (const line of lines) {
        const parts = line.split(",");
        if (parts.length < 2) continue;

        const expression = parts[0].trim().toLowerCase();
        const meaning = parts.slice(1).join(",").trim();
        if (!expression || !meaning) continue;

        // 跳过已存在的词
        if (plugin.wordStore.hasWord(expression)) continue;

        const word: Word = {
            expression,
            meaning,
            phonetic: "",
            pos: "",
            status: 1,
            t: "WORD",
            language: "en",
            tags: [],
            notes: [],
            sentences: [],
            date: Math.floor(Date.now() / 1000),
            mastery: 1,
            mdLink: null,
            exposures: 0,
            lastExposure: null,
            exposureHistory: [],
            fsrs: {
                due: new Date().toISOString().split("T")[0],
                stability: 0, difficulty: 0, state: 0,
                reps: 0, lapses: 0, lastReview: null,
            },
            ankiNoteId: null,
        };

        plugin.wordStore.addWord(word);
        count++;
    }

    return count;
}