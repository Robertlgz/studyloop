<template>
    <div id="sl-search" @click="handleClick">
        <div class="search-bar">
            <div class="search-history">
                <button :disabled="historyIndex <= 0" @click="switchHistory('prev')">&lt;</button>
                <button :disabled="historyIndex >= lastHistory" @click="switchHistory('next')">&gt;</button>
            </div>
            <input
                type="text"
                v-model="inputWord"
                placeholder="输入单词"
                @keydown.enter="handleSearch"
                class="search-input"
            />
            <button @click="handleSearch" class="search-btn" title="Search">🔍</button>
            <button
                @click="handleAddToDeck"
                :disabled="!word"
                class="add-btn"
                title="Add to deck"
            >+</button>
            <button
                @click="handleCopyMeaning"
                :disabled="!word"
                class="copy-btn"
                title="Copy word and meaning"
            >📋</button>
        </div>
        <div class="dict-area">
            <DictItem
                v-for="(cp, i) in components"
                :loading="loadings[i]"
                :name="cp.name"
                :key="cp.id"
                :id="cp.id"
            >
                <component
                    @loading="onLoading"
                    :is="cp.type"
                    :word="word"
                    v-show="shows[i]"
                />
            </DictItem>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Notice } from "obsidian";
import { ref, shallowRef, computed, onMounted, onUnmounted, getCurrentInstance } from "vue";
import type StudyLoop from "@/plugin";
import { searchAll, getEngines } from "@/dictionary/list";
import { playAudio } from "@/utils/helpers";
import DictItem from "./DictItem.vue";
import YoudaoView from "@/dictionary/youdao/View.vue";
import CambridgeView from "@/dictionary/cambridge/View.vue";
import HjdictView from "@/dictionary/hjdict/View.vue";
import DeepLView from "@/dictionary/deepl/View.vue";
import { SEARCH_ICON, LEARN_PANEL_VIEW } from "@/constant";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

// 词典组件配置
const dictComponents: Record<string, any> = {
    youdao: YoudaoView,
    cambridge: CambridgeView,
    hjdict: HjdictView,
    deepl: DeepLView,
};

// 省略组件注册
let components = shallowRef<{ id: string; name: string; type: any }[]>([]);
let map: Record<string, number> = {};
let loadings = ref<boolean[]>([]);
let shows = ref<boolean[]>([]);

// 初始化词典列表
const enabledDicts = ["youdao", "cambridge", "hjdict", "deepl"];
const dictNames: Record<string, string> = {
    youdao: "Youdao", cambridge: "Cambridge", hjdict: "Hujiang", deepl: "DeepL",
};

components.value = enabledDicts.map((id) => ({
    id,
    name: dictNames[id] || id,
    type: dictComponents[id],
}));
enabledDicts.forEach((id, i) => { map[id] = i; });
loadings.value = Array(enabledDicts.length).fill(false);
shows.value = Array(enabledDicts.length).fill(false);

function onLoading({ id, loading, result }: { id: string; loading: boolean; result: boolean }) {
    loadings.value[map[id]] = loading;
    shows.value[map[id]] = result;
}

// 历史记录
let history: string[] = (plugin.settings.search_history || []).slice();
let lastHistory = ref(history.length - 1);
let historyIndex = ref(history.length - 1);
const HISTORY_MAX = 50;

function switchHistory(direction: "prev" | "next") {
    historyIndex.value = Math.max(0, Math.min(
        historyIndex.value + (direction === "prev" ? -1 : 1),
        history.length - 1
    ));
    word.value = history[historyIndex.value];
    inputWord.value = history[historyIndex.value];
}

function appendHistory() {
    if (historyIndex.value < history.length - 1) {
        history = history.slice(0, historyIndex.value + 1);
    }
    if (!word.value || !word.value.trim()) return;
    const w = word.value.trim();
    const existingIdx = history.indexOf(w);
    if (existingIdx !== -1) {
        history.splice(existingIdx, 1);
        historyIndex.value--;
    }
    history.push(w);
    if (history.length > HISTORY_MAX) {
        history = history.slice(history.length - HISTORY_MAX);
    }
    lastHistory.value = history.length - 1;
    historyIndex.value++;
    // 持久化
    plugin.settings.search_history = history.slice();
    plugin.saveData(plugin.settings);
}

let inputWord = ref("");
let word = ref("");

const onSearch = async (evt: CustomEvent) => {
    word.value = evt.detail.selection;
    appendHistory();
};

function handleSearch() {
    word.value = inputWord.value;
    appendHistory();
}

async function handleAddToDeck() {
    if (!word.value) return;
    // 触发 LearnPanel 自动填充
    dispatchEvent(new CustomEvent("sl-search", {
        detail: { selection: word.value },
    }));
    try {
        await plugin.activateView(LEARN_PANEL_VIEW, "right");
    } catch {
        // ignore
    }
}

async function handleCopyMeaning() {
    if (!word.value) return;
    try {
        const { YoudaoEngine } = await import("@/dictionary/youdao/engine");
        const result = await YoudaoEngine.search(word.value);
        let meaning = "";
        const m = result?.meaningHTML?.match(/<li[^>]*>([\s\S]*?)<\/li>/);
        if (m) {
            const tmp = document.createElement("div");
            tmp.innerHTML = m[1];
            meaning = (tmp.textContent || "").trim();
            if (meaning.length > 80) meaning = meaning.slice(0, 80);
        }
        const text = meaning ? `${word.value}\t${meaning}` : word.value;
        await navigator.clipboard.writeText(text);
        new Notice("已复制到剪贴板");
    } catch {
        try {
            await navigator.clipboard.writeText(word.value);
        } catch {}
    }
}

function handleClick(evt: MouseEvent) {
    const target = evt.target as HTMLElement;
    if (target.hasClass("speaker")) {
        evt.preventDefault();
        evt.stopPropagation();
        playAudio((target as HTMLAnchorElement).href);
    } else if (target.tagName === "A") {
        evt.preventDefault();
        evt.stopPropagation();
        word.value = target.textContent || "";
        inputWord.value = word.value;
        appendHistory();
    }
}

onMounted(() => {
    addEventListener("sl-search", onSearch);
});

onUnmounted(() => {
    removeEventListener("sl-search", onSearch);
});
</script>

<style scoped>
#sl-search {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-size: 0.9em;
    user-select: text;
}
.search-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-bottom: 1px solid var(--background-modifier-border);
}
.search-history button,
.search-btn,
.add-btn,
.copy-btn {
    background: none;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 0.85em;
}
.search-input {
    flex: 1;
    padding: 2px 6px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
}
.dict-area {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
}
</style>