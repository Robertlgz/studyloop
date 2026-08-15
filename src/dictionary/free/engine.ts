import { request } from "obsidian";
import { DictionaryEngine, EngineResult } from "../engine";

export const FreeEngine: DictionaryEngine = {
    id: "free",
    name: "免费翻译",
    description: "Free machine translation (MyMemory)",
    requiresApiKey: false,

    async search(text: string): Promise<EngineResult> {
        try {
            const resp = await request({
                url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`,
                method: "GET",
            });
            const data = JSON.parse(resp);
            const translation = data.responseData?.translatedText || "";
            return {
                title: text,
                meaningHTML: "",
                translationHTML: `<div class="free-translation">${translation}</div>`,
                prons: [],
            };
        } catch {
            throw new Error("Free translation error");
        }
    },
};