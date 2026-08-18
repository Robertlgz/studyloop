<template>
    <div class="sl-review-modal" v-if="currentWord">
        <div class="sl-review-card">
            <div class="sl-review-header">
                <span class="sl-review-progress">{{ index + 1 }} / {{ queue.length }}</span>
                <button @click="close" class="sl-close-btn">✕</button>
            </div>
            <div class="sl-review-word">{{ currentWord.expression }}</div>
            <div class="sl-review-meaning" v-if="showMeaning">
                {{ currentWord.meaning }}
                <div class="sl-review-context" v-if="currentWord.sentences.length > 0">
                    <div v-for="(s, i) in currentWord.sentences.slice(0, 2)" :key="i" class="sl-review-sentence">
                        <em>{{ s.text }}</em>
                        <span v-if="s.trans"> — {{ s.trans }}</span>
                    </div>
                </div>
                <!-- AI 导师解答区 -->
                <div v-if="tutorAnswer" class="sl-review-tutor">
                    <div class="sl-review-tutor-label">💬 AI 导师：</div>
                    <div class="sl-review-tutor-content" v-html="tutorAnswerHtml"></div>
                    <button class="sl-review-tutor-close" @click="tutorAnswer = null">×</button>
                </div>
                <button class="sl-tutor-btn" @click="askAITutor" v-if="hasAI && !tutorAnswer">
                    💬 问 AI
                </button>
            </div>
            <div class="sl-review-buttons" v-if="!showMeaning">
                <button @click="showMeaning = true" class="sl-show-answer-btn">显示答案</button>
            </div>
            <div class="sl-review-buttons" v-else>
                <button @click="rate(1)" class="sl-rate-btn sl-rate-again">Again</button>
                <button @click="rate(2)" class="sl-rate-btn sl-rate-hard">Hard</button>
                <button @click="rate(3)" class="sl-rate-btn sl-rate-good">Good</button>
                <button @click="rate(4)" class="sl-rate-btn sl-rate-easy">Easy</button>
            </div>
            <div class="sl-review-status" v-if="showMeaning">
                状态: {{ statusLabel }}
            </div>
        </div>
    </div>
    <div class="sl-review-empty" v-else>
        <p>{{ queue.length === 0 ? '🎉 没有待复习的词' : '加载中...' }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import { Notice, request } from "obsidian";
import type StudyLoop from "@/main";
import type { Word } from "@/db/word-store";
import { calculateNextDue, createInitialCard, getDueWords } from "@/scheduling/fsrs";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const queue = ref<Word[]>([]);
const index = ref(0);
const showMeaning = ref(false);
const hasAI = computed(() => !!plugin.settings.ai_api_key);
const tutorAnswer = ref("");
const tutorAnswerHtml = ref("");

const currentWord = computed(() => queue.value[index.value] || null);
const statusLabel = computed(() => {
    const labels = ["忽略", "学习中", "熟悉", "掌握", "精通"];
    return labels[currentWord.value?.status || 0];
});

/** 加载复习队列 */
function loadReviewQueue() {
    const allWords = plugin.wordStore.getAllWords();
    queue.value = getDueWords(allWords);
    index.value = 0;
    showMeaning.value = false;
    tutorAnswer.value = "";
}

/** 评分 */
function rate(rating: 1 | 2 | 3 | 4) {
    const word = currentWord.value;
    if (!word) return;

    const prevConsecutive = word.fsrs.consecutiveGood || 0;
    const { card: newCard, status } = calculateNextDue(word.fsrs, rating, prevConsecutive);

    // 更新词库
    plugin.wordStore.updateWord(word.expression, {
        fsrs: newCard,
        status,
    });
    // 打卡 streak
    plugin.wordStore.checkInReview();

    // 记录复习日志
    plugin.wordStore.addReviewLog({
        word: word.expression,
        rating,
        date: Math.floor(Date.now() / 1000),
        elapsedDays: 0,
        scheduledDays: newCard.interval || 1,
    });

    // 下一条
    index.value++;
    showMeaning.value = false;
    tutorAnswer.value = "";

    if (index.value >= queue.value.length) {
        new Notice("🎉 复习完成！已连续学习 " + plugin.wordStore.getStreak() + " 天");
        queue.value = [];
    }
}

/** 关闭 */
function close() {
    queue.value = [];
}

/** 简单 HTML 转义 */
function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

/** AI 导师：调用 AI provider 讲解单词 */
async function askAITutor() {
    if (!currentWord.value) return;
    if (!plugin.settings.ai_api_key) {
        new Notice("请先在设置中配置 AI API Key");
        return;
    }
    const word = currentWord.value.expression;
    tutorAnswer.value = "加载中…";
    tutorAnswerHtml.value = "";
    try {
        const prompt = `请用中文简要讲解单词 "${word}"：包括音标、词性、核心释义、常用搭配和记忆技巧。控制在 100 字以内。`;
        const resp = await request({
            url: `${plugin.settings.ai_provider || "https://api.deepseek.com"}/v1/chat/completions`,
            method: "POST",
            body: JSON.stringify({
                model: plugin.settings.ai_model || "deepseek-v4-flash",
                messages: [
                    { role: "system", content: "你是英语词汇导师，用中文专业且友好地讲解单词。只输出讲解内容，不要加标题。" },
                    { role: "user", content: prompt },
                ],
                max_tokens: 300,
                temperature: 0.7,
            }),
            headers: {
                "Authorization": `Bearer ${plugin.settings.ai_api_key}`,
                "Content-Type": "application/json",
            },
        });
        const data = JSON.parse(resp);
        const content = data?.choices?.[0]?.message?.content || "AI 未能返回解释";
        tutorAnswer.value = content;
        tutorAnswerHtml.value = escapeHtml(content);
    } catch (e) {
        tutorAnswer.value = "";
        new Notice("AI 提问失败：" + ((e as Error).message || e));
    }
}

defineExpose({ loadReviewQueue });
</script>

<style scoped>
.sl-review-modal { padding: 16px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.sl-review-card { max-width: 400px; width: 100%; padding: 16px; border: 1px solid var(--background-modifier-border); border-radius: 8px; background: var(--background-primary); position: relative; }
.sl-review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.sl-review-progress { font-size: 0.8em; color: var(--text-muted); }
.sl-close-btn { background: none; border: none; cursor: pointer; font-size: 1.2em; }
.sl-review-word { font-size: 1.8em; font-weight: bold; text-align: center; margin: 20px 0; }
.sl-review-meaning { font-size: 1.1em; text-align: center; margin: 16px 0; color: var(--text-normal); }
.sl-review-context { margin-top: 12px; font-size: 0.85em; color: var(--text-muted); }
.sl-review-sentence { margin: 4px 0; }
.sl-review-tutor { margin-top: 12px; padding: 8px; background: var(--background-secondary); border-radius: 6px; font-size: 0.9em; text-align: left; white-space: pre-wrap; }
.sl-review-tutor-label { font-weight: bold; margin-bottom: 4px; }
.sl-review-tutor-content { color: var(--text-normal); line-height: 1.5; }
.sl-review-tutor-close { position: absolute; top: 4px; right: 8px; background: none; border: none; cursor: pointer; font-size: 1.2em; color: var(--text-muted); }
.sl-tutor-btn { margin-top: 8px; font-size: 0.8em; padding: 4px 12px; border: 1px solid var(--interactive-accent); border-radius: 4px; background: transparent; cursor: pointer; color: var(--interactive-accent); }
.sl-review-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
.sl-show-answer-btn { padding: 8px 24px; background: var(--interactive-accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1em; }
.sl-rate-btn { padding: 8px 16px; border: 1px solid var(--background-modifier-border); border-radius: 6px; cursor: pointer; font-size: 0.9em; }
.sl-rate-again { color: #e74c3c; }
.sl-rate-hard { color: #e67e22; }
.sl-rate-good { color: #27ae60; }
.sl-rate-easy { color: #2980b9; }
.sl-review-status { text-align: center; margin-top: 8px; font-size: 0.8em; color: var(--text-muted); }
.sl-review-empty { display: flex; align-items: center; justify-content: center; height: 100%; }
</style>
