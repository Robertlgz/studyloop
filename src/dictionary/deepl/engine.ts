import { request } from "obsidian";
import { DictionaryEngine, EngineResult } from "../engine";

export const DeepLEngine: DictionaryEngine = {
    id: "deepl",
    name: "DeepL",
    description: "All <=> Chinese",
    requiresApiKey: false,

    async search(text: string): Promise<EngineResult> {
        const r = /[\u4e00-\u9fa5]/.test(text) ? "ZH" : "ZH";
        const targetLang = /[\u4e00-\u9fa5]/.test(text) ? "EN" : "ZH";

        const body = {
            text,
            source_lang: "auto",
            target_lang: targetLang,
        };

        try {
            const resp = await request({
                url: "https://deeplx.vercel.app/translate",
                method: "POST",
                body: JSON.stringify(body),
                contentType: "application/json",
            });
            const data = JSON.parse(resp);
            if (data.code !== 200) throw new Error("DeepL API error");
            const translation = data.data || "";
            return {
                title: text,
                meaningHTML: "",
                translationHTML: `<div class="deepl-translation">${translation}</div>`,
                prons: [],
            };
        } catch {
            throw new Error("DeepL API error");
        }
    },
};