// FSRS 复习算法包装器（真实 ts-fsrs@5.4.1 集成）

import { fsrs, createEmptyCard, generatorParameters, Rating, State, Grade, type Card } from "ts-fsrs";
import { Word, FsrsCard } from "@/db/word-store";

/** FSRS 默认参数 */
const fsrsInstance = fsrs(generatorParameters({
    enable_short_term: true,
    enable_fuzz: true,
}));

/** 评分等级（1-4） */
export type ReviewRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

/** ts-fsrs Grade 映射（不含 Manual） */
const RATING_MAP: Record<ReviewRating, Grade> = {
    1: Rating.Again as Grade,
    2: Rating.Hard as Grade,
    3: Rating.Good as Grade,
    4: Rating.Easy as Grade,
};

/** 状态标签（0-4） */
const STATUS_LABELS = ["ignore", "learning", "familiar", "known", "learned"];

/** 初始 FSRS 卡片状态 */
export function createInitialCard(): FsrsCard {
    return {
        due: new Date().toISOString().split("T")[0],
        stability: 0,
        difficulty: 0,
        state: 0,
        reps: 0,
        lapses: 0,
        lastReview: null,
        interval: 0,
        consecutiveGood: 0,
    };
}

/** 计算下次复习（真实 FSRS） */
export function calculateNextDue(
    card: FsrsCard,
    rating: ReviewRating,
    previousConsecutiveGood: number = 0,
): { card: FsrsCard; status: number; consecutiveGood: number } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 转换为 ts-fsrs Card 格式
    const fsrsCard: Card = {
        due: card.due ? new Date(card.due) : now,
        stability: card.stability || 0,
        difficulty: card.difficulty || 0,
        state: (card.state as State) || State.New,
        reps: card.reps || 0,
        lapses: card.lapses || 0,
        last_review: card.lastReview ? new Date(card.lastReview) : undefined,
        scheduled_days: card.interval || 0,
        elapsed_days: 0,
        learning_steps: 0,
    };

    // 调 ts-fsrs 调度器
    const result = fsrsInstance.next(fsrsCard, now, RATING_MAP[rating]);
    const newFsrsCard = result[rating].card;

    // 转回 StudyLoop FsrsCard
    const newCard: FsrsCard = {
        due: newFsrsCard.due.toISOString().split("T")[0],
        stability: newFsrsCard.stability,
        difficulty: newFsrsCard.difficulty,
        state: newFsrsCard.state as number,
        reps: newFsrsCard.reps,
        lapses: newFsrsCard.lapses,
        lastReview: today,
        interval: newFsrsCard.scheduled_days,
        consecutiveGood: rating === 3 ? previousConsecutiveGood + 1 : 0,
    };

    // 状态自动推进
    let status = 0;
    const consecutiveGood = newCard.consecutiveGood || 0;

    if (rating === 1) {
        status = 1; // Again → 学习中
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

/** 复习下一张（获取待复习词） */
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