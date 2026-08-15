// 英文文本解析器
// 基于 retext-english 进行英文分词，Aho-Corasick 匹配词组
// 输出带状态标记的 HTML，用于阅读视图渲染

import { unified, Processor } from "unified";
import retextEnglish from "retext-english";
import { Root, Content, Literal, Parent, Sentence } from "nlcst";
import { modifyChildren } from "unist-util-modify-children";
import { visit } from "unist-util-visit";
import { toString } from "nlcst-to-string";

const STATUS_CLASS = ["ignore", "learning", "familiar", "known", "learned"];

/** 单词状态缓存（由外部注入） */
export interface WordStatus {
    text: string;
    status: number; // 0-4
}

/** 词组定义 */
export interface Phrase {
    text: string;
    status: number;
    offset: number;
}

export class TextParser {
    private processor: Processor;
    private phrases: Phrase[] = [];
    private words: Map<string, WordStatus> = new Map();
    private pIdx = 0;

    constructor() {
        this.processor = unified()
            .use(retextEnglish)
            .use(this.addPhrases())
            .use(this.stringify2HTML());
    }

    /** 解析文本，返回带状态标记的 HTML */
    async parse(data: string, wordStatuses: WordStatus[] = [], phrases: Phrase[] = []): Promise<string> {
        this.pIdx = 0;
        this.words.clear();
        this.phrases = phrases;

        // 构建单词状态索引
        for (const w of wordStatuses) {
            this.words.set(w.text.toLowerCase(), w);
        }

        const ast = this.processor.parse(data);
        const HTML = this.processor.stringify(ast) as unknown as string;
        return HTML;
    }

    /** 统计单词 */
    async countWords(text: string, wordStatuses: WordStatus[] = []): Promise<{ unknown: number; learn: number; ignore: number }> {
        const ast = this.processor.parse(text);
        const wordSet = new Set<string>();
        visit(ast, "WordNode", (word) => {
            const t = toString(word).toLowerCase();
            if (/[0-9\u4e00-\u9fa5]/.test(t)) return;
            wordSet.add(t);
        });

        let unknown = 0, learn = 0, ignore = 0;
        for (const w of wordSet) {
            const found = wordStatuses.find(s => s.text === w);
            if (!found) unknown++;
            else if (found.status === 0) ignore++;
            else learn++;
        }
        return { unknown, learn, ignore };
    }

    /** 计算阅读难度（Flesch-Kincaid 近似） */
    calcReadability(text: string): { score: number; level: string } {
        const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
        const words = text.split(/\s+/).filter(Boolean).length || 1;
        const syllables = this.countSyllables(text);
        const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
        let level: string;
        if (score >= 90) level = "A1";
        else if (score >= 60) level = "A2";
        else if (score >= 30) level = "B1";
        else if (score >= 10) level = "B2";
        else if (score >= 0) level = "C1";
        else level = "C2";
        return { score: Math.round(score * 10) / 10, level };
    }

    private countSyllables(text: string): number {
        const words = text.toLowerCase().split(/\s+/);
        let count = 0;
        for (const w of words) {
            const matches = w.match(/[aeiouy]+/g);
            count += matches ? matches.length : 1;
        }
        return count;
    }

    private addPhrases() {
        const self = this;
        return function (_option = {}) {
            const proto = (this as any).Parser.prototype;
            proto.useFirst("tokenizeParagraph", self.phraseModifier);
        };
    }

    private phraseModifier = modifyChildren(this.wrapWord2Phrase.bind(this));

    private wrapWord2Phrase(node: Content, _index: number, _parent: Parent) {
        if (!node.hasOwnProperty("children")) return;
        if (this.pIdx >= this.phrases.length || (node as any).position.end.offset <= this.phrases[this.pIdx].offset) return;

        const children = (node as Sentence).children;
        const p = this.phrases[this.pIdx];

        let foundIdx = children.findIndex(
            (child) => (child as any).position.start.offset === p.offset
        );
        if (foundIdx === -1) {
            this.pIdx++;
            return;
        }

        let endIdx = children.findIndex(
            (child) => (child as any).position.end.offset === p.offset + p.text.length
        );
        if (endIdx === -1) {
            this.pIdx++;
            return;
        }

        const phrase = children.slice(foundIdx, endIdx + 1);
        children.splice(foundIdx, endIdx - foundIdx + 1, {
            type: "PhraseNode",
            children: phrase,
            position: {
                start: { ...(phrase[0] as any).position.start },
                end: { ...(phrase[phrase.length - 1] as any).position.end },
            },
        } as any);

        this.pIdx++;
    }

    private stringify2HTML() {
        const self = this;
        return function () {
            Object.assign(this, {
                Compiler: self.compileHTML.bind(self),
            });
        };
    }

    private compileHTML(tree: Root): string {
        return this.toHTMLString(tree);
    }

    private toHTMLString(node: any): string {
        if (node.hasOwnProperty("value")) {
            return node.value;
        }
        if (node.hasOwnProperty("children")) {
            switch (node.type) {
                case "WordNode": {
                    const text = toString(node.children);
                    const textLower = text.toLowerCase();
                    const status = this.words.has(textLower)
                        ? STATUS_CLASS[this.words.get(textLower)!.status]
                        : "new";
                    return /[0-9\u4e00-\u9fa5]/.test(text)
                        ? `<span class="sl-other">${text}</span>`
                        : `<span class="sl-word ${status}">${text}</span>`;
                }
                case "PhraseNode": {
                    const childText = toString(node.children);
                    const phrase = this.phrases.find(p => p.text === childText.toLowerCase());
                    const status = phrase ? STATUS_CLASS[phrase.status] : "new";
                    const inner = this.toHTMLString(node.children);
                    return `<span class="sl-phrase ${status}">${inner}</span>`;
                }
                case "SentenceNode": {
                    return `<span class="sl-stns">${this.toHTMLString(node.children)}</span>`;
                }
                case "ParagraphNode": {
                    return `<p>${this.toHTMLString(node.children)}</p>`;
                }
                default: {
                    return `<div class="sl-article">${this.toHTMLString(node.children)}</div>`;
                }
            }
        }
        if (Array.isArray(node)) {
            return node.map((n) => this.toHTMLString(n)).join("");
        }
        return "";
    }
}