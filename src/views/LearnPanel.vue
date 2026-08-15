<template>
    <div id="sl-learn-panel">
        <div class="sl-form">
            <!-- 单词/短语 -->
            <div class="sl-field">
                <label>单词/短语</label>
                <input v-model="model.expression" placeholder="输入单词或短语" />
            </div>
            <!-- 释义 -->
            <div class="sl-field">
                <label>释义</label>
                <textarea v-model="model.meaning" placeholder="简短释义" rows="2"></textarea>
            </div>
            <!-- 类型 -->
            <div class="sl-field-row">
                <label>类型</label>
                <label><input type="radio" v-model="model.t" value="WORD" /> 单词</label>
                <label><input type="radio" v-model="model.t" value="PHRASE" /> 短语</label>
            </div>
            <!-- 状态 -->
            <div class="sl-field-row">
                <label>状态</label>
                <button v-for="(s, i) in statusLabels" :key="i" @click="model.status = i"
                    :class="{ active: model.status === i }">{{ s }}</button>
            </div>
            <!-- 标签 -->
            <div class="sl-field">
                <label>标签</label>
                <input v-model="tagInput" placeholder="输入标签后回车" @keydown.enter="addTag" />
                <div class="sl-tags">
                    <span v-for="(tag, i) in model.tags" :key="i" class="sl-tag" @click="removeTag(i)">{{ tag }} ✕</span>
                </div>
            </div>
            <!-- 例句 -->
            <div class="sl-field">
                <label>例句</label>
                <div v-for="(sen, i) in model.sentences" :key="i" class="sl-sentence">
                    <input v-model="sen.text" placeholder="英文例句" />
                    <input v-model="sen.trans" placeholder="中文翻译（可选）" />
                    <input v-model="sen.origin" placeholder="来源（可选）" />
                </div>
                <button @click="addSentence" class="sl-add-btn">+ 添加例句</button>
            </div>
            <!-- 提交 -->
            <button @click="submit" :disabled="submitLoading" class="sl-submit-btn">
                {{ submitLoading ? '提交中...' : '提交' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from "vue";
import { Notice } from "obsidian";
import type StudyLoop from "@/main";
import type { Word, Sentence } from "@/db/word-store";
import { LEARN_PANEL_VIEW } from "@/constant";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;
const statusLabels = ["忽略", "学习中", "熟悉", "掌握", "精通"];

let model = ref<{
    expression: string;
    meaning: string;
    status: number;
    t: "WORD" | "PHRASE";
    tags: string[];
    sentences: Sentence[];
}>({
    expression: "",
    meaning: "",
    status: 1,
    t: "WORD",
    tags: [],
    sentences: [],
});

const tagInput = ref("");
const submitLoading = ref(false);

function addTag() {
    const tag = tagInput.value.trim();
    if (tag && !model.value.tags.includes(tag)) {
        model.value.tags.push(tag);
    }
    tagInput.value = "";
}

function removeTag(index: number) {
    model.value.tags.splice(index, 1);
}

function addSentence() {
    model.value.sentences.push({ text: "", trans: "", origin: "" });
}

async function submit() {
    if (!model.value.expression.trim()) {
        new Notice("单词不能为空");
        return;
    }
    if (!model.value.meaning.trim()) {
        new Notice("释义不能为空");
        return;
    }

    submitLoading.value = true;
    try {
        const expr = model.value.expression.trim().toLowerCase();

        // 检测 .md 卡链接（优化 E）
        let mdLink: string | null = null;
        try {
            const file = plugin.app.vault.getAbstractFileByPath(`0单词卡片盒/${expr}.md`);
            if (file) mdLink = `0单词卡片盒/${expr}.md`;
        } catch {}

        // 检查词库中是否已存在
        const existing = plugin.wordStore.getWord(expr);
        const isNew = !existing;

        // 构建 Word 对象
        const word: Word = {
            expression: expr,
            meaning: model.value.meaning.trim(),
            phonetic: existing?.phonetic || "",
            pos: existing?.pos || "",
            status: model.value.status,
            t: model.value.t,
            language: "en",
            tags: model.value.tags,
            notes: existing?.notes || [],
            sentences: model.value.sentences.filter(s => s.text.trim()),
            date: Math.floor(Date.now() / 1000),
            mastery: model.value.status,
            mdLink,
            exposures: existing?.exposures || 0,
            lastExposure: existing?.lastExposure || null,
            exposureHistory: existing?.exposureHistory || [],
            fsrs: existing?.fsrs || {
                due: new Date().toISOString().split("T")[0],
                stability: 0,
                difficulty: 0,
                state: 0,
                reps: 0,
                lapses: 0,
                lastReview: null,
            },
            ankiNoteId: existing?.ankiNoteId || null,
        };

        plugin.wordStore.addWord(word);

        // 触发刷新事件
        dispatchEvent(new CustomEvent("sl-refresh", {
            detail: { expression: expr, type: model.value.t, status: model.value.status },
        }));

        new Notice(isNew ? `✓ ${expr} 已加入词库` : `✓ ${expr} 已更新`);

        // 重置表单（优化 C9）
        model.value = {
            expression: "",
            meaning: "",
            status: 1,
            t: "WORD",
            tags: [],
            sentences: [],
        };
    } catch (e) {
        new Notice("提交失败: " + (e as Error).message);
    } finally {
        submitLoading.value = false;
    }
}

// 监听查词事件自动填充
addEventListener("sl-search", ((evt: CustomEvent) => {
    const selection = evt.detail.selection as string;
    const stored = plugin.wordStore.getWord(selection);

    if (stored) {
        // 已存在，加载到表单
        model.value = {
            expression: stored.expression,
            meaning: stored.meaning,
            status: stored.status,
            t: stored.t as "WORD" | "PHRASE",
            tags: stored.tags,
            sentences: stored.sentences,
        };
    } else {
        // 新词，预填
        const suggestedMeaning = evt.detail.suggestedMeaning as string || "";
        const sentenceContext = evt.detail.sentenceContext as string || "";
        model.value = {
            expression: selection,
            meaning: suggestedMeaning,
            status: 1,
            t: selection.trim().includes(" ") ? "PHRASE" : "WORD",
            tags: [],
            sentences: sentenceContext ? [{ text: sentenceContext, trans: "", origin: "" }] : [],
        };
    }
}) as EventListener);
</script>

<style scoped>
#sl-learn-panel { padding: 8px; font-size: 0.9em; }
.sl-field { margin-bottom: 8px; }
.sl-field label { display: block; font-weight: bold; margin-bottom: 2px; font-size: 0.85em; }
.sl-field input, .sl-field textarea { width: 100%; padding: 4px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); }
.sl-field-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sl-field-row label { font-weight: bold; font-size: 0.85em; }
.sl-field-row button { padding: 2px 6px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: transparent; cursor: pointer; font-size: 0.8em; }
.sl-field-row button.active { background: var(--interactive-accent); color: white; }
.sl-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.sl-tag { background: var(--background-secondary); padding: 1px 6px; border-radius: 3px; font-size: 0.8em; cursor: pointer; }
.sl-sentence { border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px; margin-bottom: 4px; }
.sl-sentence input { margin-bottom: 2px; }
.sl-add-btn { font-size: 0.8em; padding: 2px 8px; }
.sl-submit-btn { width: 100%; padding: 6px; margin-top: 8px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
.sl-submit-btn:disabled { opacity: 0.5; }
</style>