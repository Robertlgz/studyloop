// AI 造句批改（huanmuyu 式）
// 用户用新词造句，AI 批改语法和用法

import { request } from "obsidian";
import type StudyLoop from "@/main";

export interface SentenceCorrection {
    original: string;
    corrected: string;
    issues: string[];
    explanation: string;
}

/** AI 造句批改 */
export async function correctSentence(
    plugin: StudyLoop,
    word: string,
    sentence: string,
): Promise<SentenceCorrection> {
    const apiKey = plugin.settings.ai_api_key;
    const baseUrl = plugin.settings.ai_provider || "https://api.deepseek.com";
    const model = plugin.settings.ai_model || "deepseek-v4-flash";

    if (!apiKey) {
        throw new Error("AI API key not configured");
    }

    const prompt = `You are an English teacher. A student is learning the word "${word}" and wrote this sentence:

"${sentence}"

Please:
1. Correct any grammar or usage errors in the sentence
2. List the issues (if any)
3. Explain how the word "${word}" is used in the corrected sentence

Format your response as JSON:
{
  "corrected": "corrected sentence",
  "issues": ["issue 1", "issue 2"],
  "explanation": "explanation of word usage"
}`;

    try {
        const resp = await request({
            url: `${baseUrl}/v1/chat/completions`,
            method: "POST",
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: "You are a helpful English teacher. Respond in JSON format." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 500,
            }),
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        });
        const data = JSON.parse(resp);
        const content = data.choices?.[0]?.message?.content || "";
        const result = JSON.parse(content);
        return {
            original: sentence,
            corrected: result.corrected || sentence,
            issues: result.issues || [],
            explanation: result.explanation || "",
        };
    } catch (e) {
        throw new Error("AI correction failed: " + (e as Error).message);
    }
}