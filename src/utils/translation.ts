// 真实翻译工具（BilingualView / ReadingArea 双语翻译共用）
// 后端：MyMemory（免费）/ Youdao 网页接口 / AI（DeepSeek/OpenAI/Groq）
// 失败时逐级降级：所选后端 → MyMemory → 抛错

import { request } from "obsidian";

export interface TranslationConfig {
    backend: string;          // mymemory | youdao | deepseek | openai | groq | baidu
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    targetLang?: string;
}

const TARGET = "zh-CN";

/** 转义 HTML */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** MyMemory 免费翻译 */
async function translateWithMyMemory(text: string, target: string): Promise<string> {
    const resp = await request({
        url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent("en|" + target)}`,
        method: "GET",
    });
    const data = JSON.parse(resp);
    const translated = data?.responseData?.translatedText;
    if (!translated) {
        throw new Error("MyMemory: empty result");
    }
    return translated;
}

/** Youdao 免费网页接口 */
async function translateWithYoudao(text: string): Promise<string> {
    const resp = await request({
        url: `https://fanyi.youdao.com/translate?&i=${encodeURIComponent(text)}&doctype=json&type=AUTO`,
        method: "GET",
    });
    const data = JSON.parse(resp);
    const lines: string[] = data?.translateResult?.[0] || [];
    const translated = lines.map((l: { tgt: string }) => l.tgt).join("");
    if (!translated) {
        throw new Error("Youdao: empty result");
    }
    return translated;
}

/** AI 翻译（OpenAI 兼容接口） */
async function translateWithAI(
    text: string,
    cfg: { apiKey: string; baseUrl: string; model: string },
    target: string,
): Promise<string> {
    const prompt =
        `Translate the following English text into Simplified Chinese. ` +
        `Keep the meaning accurate and natural. Only output the translation, no explanations.\n\n` +
        JSON.stringify(text);
    const resp = await request({
        url: `${cfg.baseUrl || "https://api.deepseek.com"}/v1/chat/completions`,
        method: "POST",
        body: JSON.stringify({
            model: cfg.model || "deepseek-v4-flash",
            messages: [
                { role: "system", content: "You are a professional translator. Respond only with the Chinese translation." },
                { role: "user", content: prompt },
            ],
            max_tokens: Math.min(2000, text.length * 2 + 200),
            temperature: 0.2,
        }),
        headers: {
            "Authorization": `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json",
        },
    });
    const data = JSON.parse(resp);
    const content: string = data?.choices?.[0]?.message?.content || "";
    if (!content) {
        throw new Error("AI: empty result");
    }
    // AI 可能返回带引号的包装
    return content.trim().replace(/^["']|["']$/g, "");
}

/**
 * 翻译一段文本。
 * 翻译结果会去重多次，但返回原文的转义 HTML 需由调用方处理。
 */
export async function translateText(
    text: string,
    cfg: TranslationConfig,
): Promise<string> {
    const target = cfg.targetLang || TARGET;
    const backend = cfg.backend || "mymemory";

    // AI 后端
    if (["deepseek", "openai", "groq", "baidu"].includes(backend)) {
        if (cfg.apiKey) {
            try {
                return await translateWithAI(text, {
                    apiKey: cfg.apiKey,
                    baseUrl: cfg.baseUrl || (backend === "openai" ? "https://api.openai.com" : backend === "groq" ? "https://api.groq.com/openai" : "https://api.deepseek.com"),
                    model: cfg.model,
                }, target);
            } catch (e) {
                // 降级：无 key 或调用失败时走免费后端
            }
        }
    }

    if (backend === "youdao") {
        try {
            return await translateWithYoudao(text);
        } catch {
            // fall through
        }
    }

    // MyMemory 兜底
    try {
        return await translateWithMyMemory(text, target);
    } catch (e) {
        throw new Error("翻译失败：" + (e as Error).message);
    }
}

export { escapeHtml };