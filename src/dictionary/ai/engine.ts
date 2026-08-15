import { request } from "obsidian";
import { DictionaryEngine, EngineResult } from "../engine";

export const AiEngine: DictionaryEngine = {
    id: "ai",
    name: "AI 释义",
    description: "AI-generated definitions (requires API key)",
    requiresApiKey: true,

    async search(text: string, config?: any): Promise<EngineResult> {
        const apiKey = config?.aiApiKey || "";
        const baseUrl = config?.aiProvider || "https://api.deepseek.com";
        const model = config?.aiModel || "deepseek-v4-flash";

        if (!apiKey) throw new Error("AI API key not configured");

        const prompt = `You are a helpful English vocabulary assistant. 

For the word "${text}", provide:
1. The part of speech
2. A concise Chinese definition (1-2 sentences)
3. One example sentence in English with Chinese translation

Format as plain text, no markdown.`;

        try {
            const resp = await request({
                url: `${baseUrl}/v1/chat/completions`,
                method: "POST",
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: "You are a helpful English vocabulary assistant. Response in Chinese and English." },
                        { role: "user", content: prompt },
                    ],
                    max_tokens: 300,
                }),
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            });
            const data = JSON.parse(resp);
            const content = data.choices?.[0]?.message?.content || "";
            const escaped = content.replace(/\n/g, "<br>");

            return {
                title: text,
                meaningHTML: `<div class="ai-definition">${escaped}</div>`,
                translationHTML: "",
                prons: [],
            };
        } catch (e) {
            throw new Error("AI API error: " + (e as any).message);
        }
    },
};