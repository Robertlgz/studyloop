// 复习数据同步模块
// 蒸馏自 LL 的 refreshTextDB / refreshReviewDb
// 把 worddb.json 同步到 .txt 文件供 SR/Various Complements 读取

import { Notice, TFile } from "obsidian";
import type StudyLoop from "@/main";

const STATUS_NAMES = ["Ignore", "Learning", "Familiar", "Known", "Learned"];

/** 同步复习数据库 → 0单词卡片盒/复习数据.txt */
export async function syncReviewDatabase(plugin: StudyLoop): Promise<number> {
    if (!plugin.settings.review_database) return 0;

    const dbPath = plugin.settings.review_database;
    const file = plugin.app.vault.getAbstractFileByPath(dbPath);
    if (!file || file.hasOwnProperty("children")) {
        new Notice("复习数据库路径无效");
        return 0;
    }

    const allWords = plugin.wordStore.getAllWords();
    if (allWords.length === 0) return 0;

    const del = plugin.settings.review_delimiter;
    const today = new Date().toISOString().split("T")[0];

    // 生成 flashcards 格式
    const blocks: string = allWords.map((w) => {
        const notes: string = w.notes.length === 0 ? "" : "**Notes**:\n" + w.notes.join("\n").trim() + "\n";
        const sentences: string = w.sentences.length === 0
            ? ""
            : "**Sentences**:\n" + w.sentences.map((s) => "*" + s.text.trim() + "*" + (s.trans ? "\n" + s.trans.trim() : "")).join("<br>") + "\n";
        const srTag: string = `<!--SR:!${w.fsrs.due},${w.fsrs.interval || 0},250!-->`;
        return `#word\n#### ${w.expression}\n${del}\n${w.meaning}\n${notes}${sentences}${srTag}\n`;
    }).join("\n");

    const content = "#flashcards\n\n" + blocks + "\n";
    await plugin.app.vault.modify(file as TFile, content);

    await plugin.saveSettings();
    return allWords.length;
}

/** 同步词汇统计 → 0单词卡片盒/词汇统计.txt */
export async function syncWordDatabase(plugin: StudyLoop): Promise<number> {
    if (!plugin.settings.word_database) return 0;

    const dbPath = plugin.settings.word_database;
    const file = plugin.app.vault.getAbstractFileByPath(dbPath);
    if (!file || file.hasOwnProperty("children")) {
        new Notice("词汇统计数据库路径无效");
        return 0;
    }

    const allWords = plugin.wordStore.getAllWords();
    if (allWords.length === 0) return 0;

    const classified: number[][] = Array.from({ length: 5 }, () => []);
    allWords.forEach((w, i) => {
        if (w.status >= 0 && w.status <= 4) classified[w.status].push(i);
    });

    const del = plugin.settings.col_delimiter;

    // 正向：按状态分组（忽略 → 学习 → 熟悉 → 掌握 → 精通）
    const classifiedTexts = classified.map((indices, idx) => {
        return `#### ${STATUS_NAMES[idx]}\n` + indices
            .map((i) => `${allWords[i].expression}${del}    ${allWords[i].meaning}`)
            .join("\n") + "\n";
    });
    // 去掉 Ignore
    classifiedTexts.shift();
    const word2Meaning = classifiedTexts.join("\n");

    // 反向查询
    const meaning2Word = classified.flat()
        .map((i) => `${allWords[i].meaning}  ${del}  ${allWords[i].expression}`)
        .join("\n");

    const content = word2Meaning + "\n\n" + "#### 反向查询\n" + meaning2Word;
    await plugin.app.vault.modify(file as TFile, content);

    return allWords.length;
}

/** 触发各种补全重新加载 */
export async function triggerVariousComplementsReload(plugin: StudyLoop) {
    try {
        (plugin.app as any).commands.executeCommandById("various-complements:reload-custom-dictionaries");
    } catch {
        // Various Complements 未安装，静默忽略
    }
}