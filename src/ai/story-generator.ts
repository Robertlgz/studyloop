// AI 复习故事生成器
// 每周用最近学的词生成一篇短故事

import { request } from "obsidian";
import type StudyLoop from "@/main";

export interface ReviewStory {
    title: string;
    content: string;
    words: string[];
    quiz: string[];
}

/** 生成复习故事 */
export async function generateReviewStory(
    plugin: StudyLoop,
    words: string[],
    count: number = 5,
): Promise<ReviewStory> {
    const apiKey = plugin.settings.ai_api_key;
    const baseUrl = plugin.settings.ai_provider || "https://api.deepseek.com";
    const model = plugin.settings.ai_model || "deepseek-v4-flash";

    if (!apiKey) throw new Error("AI API key not configured");
    if (words.length === 0) throw new Error("No words to create story");

    // 选取最近 N 个词
    const selectedWords = words.slice(0, count);
    const wordList = selectedWords.join(", ");

    const prompt = `Write a short English story (200-300 words) using these vocabulary words: ${wordList}.

Requirements:
1. The story must have a clear plot, characters, and setting
2. Each target word must be used at least once, naturally
3. The vocabulary level should be B1-B2 learner friendly
4. After the story, include 5 quiz questions (one per target word)

Output format:
TITLE: <story title>

<story content>

QUIZ:
1. <question about word 1>
2. <question about word 2>
3. <question about word 3>
4. <question about word 4>
5. <question about word 5>`;

    try {
        const resp = await request({
            url: `${baseUrl}/v1/chat/completions`,
            method: "POST",
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: "You are a creative English teacher. Write engaging stories for language learners." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 1000,
            }),
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        });
        const data = JSON.parse(resp);
        const content = data.choices?.[0]?.message?.content || "";

        // 解析结果
        const titleMatch = content.match(/TITLE:\s*(.+)/);
        const quizMatch = content.match(/QUIZ:\n([\s\S]*)/);
        const storyContent = content
            .replace(/TITLE:\s*.+\n/, "")
            .replace(/QUIZ:\n[\s\S]*/, "")
            .trim();

        const quiz = quizMatch
            ? quizMatch[1].split("\n").filter((l: string) => l.trim())
            : [];

        return {
            title: titleMatch?.[1]?.trim() || "Review Story",
            content: storyContent,
            words: selectedWords,
            quiz,
        };
    } catch (e) {
        throw new Error("Story generation failed: " + (e as Error).message);
    }
}