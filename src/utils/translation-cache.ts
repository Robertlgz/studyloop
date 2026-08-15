// 翻译缓存（LRU + content hash）
// 同 vault 同步（存在 worddb.json 的 translationCache 字段）

export interface CacheEntry {
    hash: string;
    original: string;
    translated: string;
    backend: string;
    targetLang: string;
    createdAt: string;
    useCount: number;
}

export class TranslationCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number;

    constructor(maxSize = 500) {
        this.maxSize = maxSize;
    }

    /** 从持久化数据加载 */
    load(entries: Record<string, CacheEntry>) {
        this.cache.clear();
        for (const [key, val] of Object.entries(entries || {})) {
            this.cache.set(key, val);
        }
    }

    /** 导出为持久化数据 */
    export(): Record<string, CacheEntry> {
        const result: Record<string, CacheEntry> = {};
        this.cache.forEach((val, key) => { result[key] = val; });
        return result;
    }

    /** 计算内容哈希 */
    hash(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `h${Math.abs(hash).toString(16)}`;
    }

    /** 获取缓存 */
    get(text: string, targetLang: string): string | null {
        const key = `${this.hash(text)}:${targetLang}`;
        const entry = this.cache.get(key);
        if (entry) {
            entry.useCount++;
            return entry.translated;
        }
        return null;
    }

    /** 设置缓存 */
    set(text: string, translated: string, backend: string, targetLang: string) {
        const key = `${this.hash(text)}:${targetLang}`;
        this.cache.set(key, {
            hash: this.hash(text),
            original: text.slice(0, 100),
            translated,
            backend,
            targetLang,
            createdAt: new Date().toISOString(),
            useCount: 1,
        });

        // LRU 淘汰
        if (this.cache.size > this.maxSize) {
            const oldest = this.cache.entries().next().value;
            if (oldest) this.cache.delete(oldest[0]);
        }
    }

    /** 获取缓存大小 */
    get size(): number { return this.cache.size; }
}