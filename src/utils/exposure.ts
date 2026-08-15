// 曝光追踪工具
// 记录用户在阅读视图中看到某个词的次数

import type StudyLoop from "@/main";

/** 增加曝光计数 */
export function incrementExposure(plugin: StudyLoop, expression: string) {
    plugin.wordStore.incrementExposure(expression);
}

/** 批量增加曝光 */
export function incrementExposures(plugin: StudyLoop, words: string[]) {
    for (const w of words) {
        plugin.wordStore.incrementExposure(w);
    }
}

/** 获取曝光最多的词 */
export function getTopExposures(plugin: StudyLoop, limit = 10) {
    return plugin.wordStore.getAllWords()
        .filter(w => (w.exposures || 0) > 0)
        .sort((a, b) => (b.exposures || 0) - (a.exposures || 0))
        .slice(0, limit);
}

/** 获取今日曝光词 */
export function getTodayExposures(plugin: StudyLoop) {
    const today = new Date().toISOString().split("T")[0];
    return plugin.wordStore.getAllWords()
        .filter(w => w.lastExposure === today);
}