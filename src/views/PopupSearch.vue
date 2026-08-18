<template>
    <div class="sl-popup-search" :style="{ left: pos.x + 'px', top: pos.y + 'px' }" @click.stop>
        <div class="sl-popup-header">
            <span class="sl-popup-word">{{ word }}</span>
            <button @click="close" class="sl-popup-close">✕</button>
        </div>
        <div class="sl-popup-body">
            <div class="sl-popup-loading" v-if="loading">加载中...</div>
            <div v-else-if="error" class="sl-popup-error">{{ error }}</div>
            <div v-else-if="result" class="sl-popup-result">
                <div class="sl-popup-meaning" v-html="result.meaningHTML"></div>
                <div class="sl-popup-trans" v-if="result.translationHTML" v-html="result.translationHTML"></div>
            </div>
            <div class="sl-popup-actions">
                <button @click="addToDeck" class="sl-popup-add" :disabled="!word">+ 加入词库</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { Notice } from "obsidian";
import type StudyLoop from "@/main";
import { searchAll } from "@/dictionary/list";
import { createInitialCard } from "@/scheduling/fsrs";
import type { Word } from "@/db/word-store";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const word = ref("");
const pos = ref({ x: 100, y: 100 });
const result = ref<any>(null);
const loading = ref(false);
const error = ref("");

async function onSearch(evt: CustomEvent) {
    word.value = evt.detail.selection;
    pos.value = evt.detail.position || { x: 100, y: 100 };
    loading.value = true;
    error.value = "";
    result.value = null;

    try {
        const enabled = Object.keys(plugin.settings.dictionaries).filter(
            id => plugin.settings.dictionaries[id].enable
        );
        const res = await searchAll(word.value, enabled, {
            aiApiKey: plugin.settings.ai_api_key,
            aiProvider: plugin.settings.ai_provider,
            aiModel: plugin.settings.ai_model,
        });
        if (res) {
            result.value = res.result;
        } else {
            error.value = "未找到释义";
        }
    } catch {
        error.value = "查询失败";
    } finally {
        loading.value = false;
    }
}

function addToDeck() {
    if (!word.value) return;
    const expr = word.value.trim().toLowerCase();
    if (plugin.wordStore.hasWord(expr)) {
        new Notice(`✓ ${expr} 已在词库中`);
        return;
    }

    let meaning = "";
    if (result.value?.meaningHTML) {
        const tmp = document.createElement("div");
        tmp.innerHTML = result.value.meaningHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 80);
    }

    const newWord: Word = {
        expression: expr,
        meaning: meaning || "待补充释义",
        phonetic: "",
        pos: "",
        status: 1,
        t: "WORD",
        language: "en",
        tags: [],
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
}

function close() {
    plugin.vueApp && plugin["closePopupSearch"]?.();
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
    width: 360px;
    max-height: 400px;
    background: var(--background-primary);
    border: 1px solid var(--interactive-accent);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    overflow: hidden;
}
.sl-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: var(--background-secondary);
    font-weight: bold;
    border-bottom: 1px solid var(--background-modifier-border);
}
.sl-popup-close { background: none; border: none; cursor: pointer; font-size: 1em; }
.sl-popup-body { padding: 8px 10px; max-height: 330px; overflow-y: auto; font-size: 0.85em; }
.sl-popup-loading, .sl-popup-error { text-align: center; color: var(--text-muted); padding: 12px; }
.sl-popup-actions { margin-top: 8px; text-align: center; }
.sl-popup-add { padding: 4px 16px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px; cursor: pointer; }
</style>