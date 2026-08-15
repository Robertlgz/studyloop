// 词典引擎抽象接口
// 所有词典引擎实现这个接口，SearchPanel 按优先级依次调用

export interface EngineResult {
    // 词典引擎返回的标准化结果
    title: string;       // 词条标题
    meaningHTML: string; // 释义 HTML
    translationHTML: string; // 翻译 HTML
    prons: Array<{ phsym: string; url: string }>;
    // 可选扩展数据
    collins?: CollinsEntry[];
    discriminationHTML?: string;
    wordGroupHTML?: string;
    relWordHTML?: string;
    // 建议词形（related search）
    suggestions?: string;
}

export interface CollinsEntry {
    title: string;
    content: string;
}

export interface DictionaryEngine {
    id: string;
    name: string;
    description: string;
    requiresApiKey: boolean;
    search(word: string, config?: any): Promise<EngineResult>;
}