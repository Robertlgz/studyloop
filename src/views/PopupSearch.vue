<template>
    <div
        class="sl-popup-search"
        :style="popupStyle"
        @click.stop
    >
        <!-- 头部 -->
        <div class="sl-popup-header">
            <span class="sl-popup-word">{{ word }}</span>
            <button @click="close" class="sl-popup-close">✕</button>
        </div>

        <!-- 加载中（所有源都未返回时） -->
        <div class="sl-popup-loading" v-if="loading && results.length === 0">
            <span class="sl-spinner"></span> 查询中…
        </div>

        <!-- 错误 -->
        <div class="sl-popup-error" v-else-if="error && results.length === 0">{{ error }}</div>

        <!-- 多源结果 -->
        <div class="sl-popup-body" v-else>
            <div
                v-for="src in results"
                :key="src.engine.id"
                class="sl-popup-source"
            >
                <!-- 来源标签 -->
                <div class="sl-source-tag" :class="'sl-src-' + src.engine.id">
                    {{ src.engine.name }}
                </div>

                <!-- 发音 -->
                <div v-if="src.result.prons?.length" class="sl-popup-prons">
                    <span
                        v-for="(p, i) in src.result.prons"
                        :key="i"
                        class="sl-pron"
                        @click="playAudio(p.url)"
                    >
                        {{ p.phsym }}
                    </span>
                </div>

                <!-- 释义 -->
                <div v-if="src.result.meaningHTML" class="sl-popup-meaning" v-html="src.result.meaningHTML"></div>

                <!-- 翻译（翻译类引擎） -->
                <div v-if="src.result.translationHTML" class="sl-popup-trans" v-html="src.result.translationHTML"></div>

                <!-- 空结果提示 -->
                <div v-if="!src.result.meaningHTML && !src.result.translationHTML" class="sl-popup-no-result">
                    暂无释义
                </div>

                <!-- 操作按钮 -->
                <div class="sl-popup-src-actions">
                    <button @click="addToDeck(src.engine.id)" class="sl-popup-add" :disabled="adding[src.engine.id]">
                        {{ adding[src.engine.id] ? '✓' : '+ 加入词库' }}
                    </button>
                </div>
            </div>

            <!-- 无结果 -->
            <div v-if="results.length === 0 && !loading" class="sl-popup-empty">
                未找到该词的释义
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { Notice } from "obsidian";
import type StudyLoop from "@/main";
import { searchAllParallel } from "@/dictionary/list";
import type { SourceResult } from "@/dictionary/list";
import { createInitialCard } from "@/scheduling/fsrs";
import type { Word } from "@/db/word-store";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const word = ref("");
const pos = ref({ x: 100, y: 100 });
const results = ref<SourceResult[]>([]);
const loading = ref(false);
const error = ref("");
const adding = ref<Record<string, boolean>>({});

/** 弹窗位置（自动避开视口边界） */
const popupStyle = computed(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 380;
    const h = 420;
    let x = pos.value.x;
    let y = pos.value.y;
    if (x + w > vw) x = vw - w - 8;
    if (y + h > vh) y = vh - h - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    return { left: x + "px", top: y + "px" };
});

async function onSearch(evt: CustomEvent) {
    const detail = evt.detail as { selection: string; position?: { x: number; y: number } };
    word.value = detail.selection;
    pos.value = detail.position || { x: window.innerWidth - 400, y: 80 };
    results.value = [];
    loading.value = true;
    error.value = "";

    try {
        const enabled = Object.keys(plugin.settings.dictionaries).filter(
            id => plugin.settings.dictionaries[id].enable,
        );
        const res = await searchAllParallel(word.value, enabled, {
            aiApiKey: plugin.settings.ai_api_key,
            aiProvider: plugin.settings.ai_provider,
            aiModel: plugin.settings.ai_model,
        });
        results.value = res;
        if (res.length === 0) {
            error.value = "未找到该词的释义";
        }
    } catch (e) {
        error.value = "查询失败：" + ((e as Error).message || e);
    } finally {
        loading.value = false;
    }
}

function playAudio(url: string) {
    try { new Audio(url).play(); } catch { /* ignore */ }
}

async function addToDeck(engineId: string) {
    if (!word.value) return;
    if (adding.value[engineId]) return;
    const expr = word.value.trim().toLowerCase();
    if (plugin.wordStore.hasWord(expr)) {
        new Notice(`✓ ${expr} 已在词库中`);
        return;
    }
    adding.value[engineId] = true;

    // 从第一个有释义的结果中提取 meaning
    const src = results.value.find(r => r.engine.id === engineId) || results.value[0];
    let meaning = "";
    if (src?.result?.meaningHTML) {
        const tmp = document.createElement("div");
        tmp.innerHTML = src.result.meaningHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 120);
    } else if (src?.result?.translationHTML) {
        const tmp = document.createElement("div");
        tmp.innerHTML = src.result.translationHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 120);
    }

    const newWord: Word = {
        expression: expr,
        meaning: meaning || "待补充释义",
        phonetic: "",
        pos: "",
        status: 1,
        t: "WORD",
        language: "en",
        tags: [engineId],
        notes: [],
        sentences: [],
        date: Math.floor(Date.now() / 1000),
        mastery: 1,
        mdLink: null,
        exposures: 0,
        lastExposure: null,
        exposureHistory: [],
        fsrs: createInitialCard(),
        ankiNoteId: null,
    };
    plugin.wordStore.addWord(newWord);
    new Notice(`✓ ${expr} 已加入词库`);
    adding.value[engineId] = false;
}

function close() {
    plugin.vueApp && (plugin as any)["closePopupSearch"]?.();
}

onMounted(() => {
    addEventListener("sl-search", onSearch as EventListener);
});
onUnmounted(() => {
    removeEventListener("sl-search", onSearch as EventListener);
});
</script>

<style scoped>
.sl-popup-search {
    position: fixed;
    z-index: 10000;
    width: 380px;
    max-height: 420px;
    background: var(--background-primary);
    border: 1px solid var(--interactive-accent);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.sl-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--background-secondary);
    font-weight: 700;
    font-size: 1.05em;
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
}
.sl-popup-close { background: none; border: none; cursor: pointer; font-size: 1.1em; color: var(--text-muted); }
.sl-popup-close:hover { color: var(--text-normal); }
.sl-popup-loading, .sl-popup-error { text-align: center; color: var(--text-muted); padding: 24px; font-size: 0.9em; }
.sl-popup-body { flex: 1; overflow-y: auto; padding: 6px 0; }
.sl-popup-source {
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 8px 10px;
}
.sl-popup-source:last-child { border-bottom: none; }
.sl-source-tag {
    display: inline-block;
    font-size: 0.7em;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
    color: white;
}
.sl-src-youdao { background: #4a90d9; }
.sl-src-cambridge { background: #c0392b; }
.sl-src-hjdict { background: #27ae60; }
.sl-src-deepl { background: #8e44ad; }
.sl-src-ai { background: #e67e22; }
.sl-src-free { background: #7f8c8d; }
.sl-popup-prons { margin: 4px 0 6px; }
.sl-pron { margin-right: 10px; color: deeppink; cursor: pointer; font-size: 0.95em; }
.sl-pron:hover { text-decoration: underline; }
.sl-popup-meaning { font-size: 0.88em; line-height: 1.5; margin-bottom: 4px; }
.sl-popup-trans { font-size: 0.85em; color: var(--text-muted); margin-bottom: 4px; font-style: italic; }
.sl-popup-no-result { font-size: 0.85em; color: var(--text-muted); padding: 4px 0; }
.sl-popup-src-actions { margin-top: 6px; }
.sl-popup-add {
    padding: 3px 12px;
    background: var(--interactive-accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
}
.sl-popup-add:disabled { opacity: 0.6; cursor: default; }
.sl-popup-empty { text-align: center; color: var(--text-muted); padding: 24px; font-size: 0.9em; }
/* 简易 spinner */
.sl-spinner {
    display: inline-block;
    width: 12px; height: 12px;
    border: 2px solid var(--text-muted);
    border-top-color: var(--interactive-accent);
    border-radius: 50%;
    animation: sl-spin 0.6s linear infinite;
    margin-right: 6px; vertical-align: middle;
}
@keyframes sl-spin { to { transform: rotate(360deg); } }
</style>
