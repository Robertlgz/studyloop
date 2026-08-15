// 智能跳过规则（Interlinear 借鉴）
// 翻译前判断哪些段落不需要翻译

/** 检查段落是否应该跳过翻译 */
export function shouldSkipTranslation(text: string, targetLang: string = "zh-CN"): boolean {
    // 代码块
    if (/^```[\s\S]*```$/.test(text.trim())) return true;

    // 纯图片
    if (/^!\[.*?\]\(.*?\)$/.test(text.trim())) return true;

    // 纯 URL
    if (/^https?:\/\/\S+$/.test(text.trim())) return true;

    // 纯符号/数字
    if (/^[\d\s\p{P}]+$/u.test(text.trim())) return true;

    // 太短（< 20 字符）
    if (text.trim().length < 20) return true;

    // 同语言检测（如果目标是中文，段落中中文 > 80% 就不翻译）
    if (targetLang.startsWith("zh")) {
        const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        if (zhCount / text.length > 0.8) return true;
    }

    return false;
}

/** 检查段落是否包含待复习词 */
export function hasDueWord(text: string, dueWords: string[]): boolean {
    const lower = text.toLowerCase();
    return dueWords.some(w => lower.includes(w));
}