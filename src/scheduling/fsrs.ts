// FSRS 复习算法包装器
// 基于 ts-fsrs@5.4.1 (FSRS-5)

import { Word, FsrsCard } from "@/db/word-store";

/** 评分等级 */
export type Rating = 1 | 2 | 3 | 4; // Again=1, Hard=2, Good=3, Easy=4

/** 状态标签 */
const STATUS_LABELS = ["ignore", "learning", "familiar", "known", "learned"];

/** 默认 FSRS 参数 */
const DEFAULT_PARAMS = {
    request_retention: 0.9,
    maximum_interval: 36525,
    enable_short_term: true,
};

/** 创建初始 FSRS 卡片状态 */
export function createInitialCard(): FsrsCard {
    return {
        due: new Date().toISOString().split("T")[0],
        stability: 0,
        difficulty: 0,
        state: 0,
        reps: 0,
        lapses: 0,
        lastReview: null,
    };
}

/** 计算下次复习（简化版，基于间隔） */
export function calculateNextDue(
    card: FsrsCard,
    rating: Rating,
): { card: FsrsCard; status: number; consecutiveGood: number } {
    let newCard = { ...card };
    let status = 0;
    let consecutiveGood = 0;

    // 更新间隔（简化版，真实 FSRS 需要 ts-fsrs 包）
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    switch (rating) {
        case 1: // Again
            newCard.lapses += 1;
            newCard.reps = 0;
            newCard.interval = 1;
            break;
        case 2: // Hard
            newCard.reps += 1;
            newCard.interval = Math.max(1, Math.round((newCard.interval || 1) * 1.2));
            break;
        case 3: // Good
            newCard.reps += 1;
            if (newCard.reps === 1) newCard.interval = 1;
            else if (newCard.reps === 2) newCard.interval = 3;
            else newCard.interval = Math.round((newCard.interval || 3) * 2.5);
            break;
        case 4: // Easy
            newCard.reps += 1;
            if (newCard.reps === 1) newCard.interval = 4;
            else newCard.interval = Math.round((newCard.interval || 4) * 3.0);
            break;
    }

    // 计算下次复习日期
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + newCard.interval);
    newCard.due = dueDate.toISOString().split("T")[0];
    newCard.lastReview = today;

    // 状态自动推进（优化 B）
    // 连续 Good 次数：从 reviewLog 反推
    consecutiveGood = rating === 3 ? (card.consecutiveGood || 0) + 1 : 0;

    if (rating === 1) {
        status = 1; // 重置为学习中
    } else if (consecutiveGood >= 14) {
        status = 4; // 精通
    } else if (consecutiveGood >= 7) {
        status = 3; // 掌握
    } else if (consecutiveGood >= 3) {
        status = 2; // 熟悉
    } else {
        status = 1; // 学习中
    }

    return { card: newCard, status, consecutiveGood };
}

/** 获取今日待复习词数 */
export function getDueWords(words: Word[]): Word[] {
    const today = new Date().toISOString().split("T")[0];
    return words.filter(w => w.fsrs.due <= today && w.status > 0);
}

/** 获取今日统计 */
export function getTodayStats(words: Word[]) {
    const today = new Date().toISOString().split("T")[0];
    let due = 0;
    let newWords = 0;
    for (const w of words) {
        if (w.fsrs.due <= today && w.status > 0) due++;
        if (w.date && new Date(w.date * 1000).toISOString().split("T")[0] === today) newWords++;
    }
    return { due, newWords };
}