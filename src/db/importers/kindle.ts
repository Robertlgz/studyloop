// Kindle 生词本导入器
// 支持两种格式：
// 1. Kindle 官网 Vocabulary Builder 导出的 TSV（word<TAB>stem<TAB>usage...）
// 2. My Clippings.txt 风格（词头行 + 引用）

import type { Word } from "@/db/word-store";
import type StudyLoop from "@/main";

/**
 * 解析 Kindle 官网导出的生词本文本（每行一个词条，TAB 分隔）。
 * 常见列：word, stem, usage, date...
 */
export function parseKindleVocab(text: string): Array<{ expression: string; sentence?: string }> {
    const result: Array<{ expression: string; sentence?: string }> = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    for (const line of lines) {
        // TSV / CSV 格式
        if (line.includes("\t")) {
            const cols = line.split("\t").map(c => c.trim());
            const expression = (cols[0] || "").toLowerCase();
            if (!expression) continue;
            // 例句一般是第 3 列（usage），有些导出把释义/词形放在前面
            const usage = cols.find((c, i) => i >= 2 && /[a-zA-Z]{3,}\s/.test(c) && !/^[A-Z][a-z]+\s+/.test(c) === false) || cols[2] || cols[1] || "";
            result.push({ expression, sentence: usage || undefined });
            continue;
        }

        // "word — sentence" 或 "word: sentence" 单行格式
        const m = line.match(/^([a-zA-Z][a-zA-Z'-]*)\s*(?:[—–:\-]\s*|\s+)(.+)$/);
        if (m) {
            const expression = m[1].toLowerCase();
            const sentence = m[2].trim();
            if (/^[a-zA-Z][a-zA-Z'-]*$/.test(expression)) {
                result.push({ expression, sentence: /[a-zA-Z]{3,}/.test(sentence) ? sentence : undefined });
                continue;
            }
        }

        // 纯单词行
        if (/^[a-zA-Z][a-zA-Z'-]{1,45}$/.test(line)) {
            result.push({ expression: line.toLowerCase() });
        }
    }

    return result;
}

/**
 * 解析 My Clippings.txt（Kindle 笔记导出）
 * 格式：
 *   单词 (English)
 *   - 你的笔记
 * 或维护多行注释，这里只提取词头行的单词
 */
export function parseMyClippings(text: string): string[] {
    const words = new Set<string>();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\s*([a-zA-Z][a-zA-Z'-]+)\s*\([^)]*English[^)]*\)\s*$/i);
        if (m) words.add(m[1].toLowerCase());
    }
    return [...words];
}

/** 从 Kindle 导出文本导入到 StudyLoop 词库 */
export async function importFromKindle(plugin: StudyLoop, rawText: string): Promise<number> {
    const vocab = parseKindleVocab(rawText);
    if (vocab.length === 0) {
        // 尝试 My Clippings
        const clippings = parseMyClippings(rawText);
        for (const w of clippings) vocab.push({ expression: w });
    }
    if (vocab.length === 0) return 0;

    let count = 0;
    for (const item of vocab) {
        if (plugin.wordStore.hasWord(item.expression)) continue;

        const word: Word = {
            expression: item.expression,
            meaning: "",
            phonetic: "",
            pos: "",
            status: 1,
            t: "WORD",
            language: "en",
            tags: ["kindle"],
            notes: [],
            sentences: item.sentence
                ? [{ text: item.sentence, trans: "", origin: "Kindle" }]
                : [],
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