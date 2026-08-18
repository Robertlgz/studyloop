<template>
    <div class="sl-history">
        <div class="sl-history-header">
            <h3>📜 查词历史</h3>
            <button @click="clearHistory" class="sl-history-clear" v-if="items.length > 0">清除</button>
        </div>
        <div v-if="items.length === 0" class="sl-history-empty">
            暂无查词记录
        </div>
        <div class="sl-history-list" v-else>
            <div
                v-for="(item, i) in items"
                :key="i"
                class="sl-history-item"
                @click="searchWord(item.word)"
            >
                <span class="sl-history-word">{{ item.word }}</span>
                <span class="sl-history-time">{{ formatTime(item.time) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import { Notice } from "obsidian";
import type StudyLoop from "@/main";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

interface HistoryEntry { word: string; time: number }
const items = ref<HistoryEntry[]>([]);

function loadHistory() {
    try {
        const raw = localStorage.getItem("sl-popup-history");
        if (raw) items.value = JSON.parse(raw);
    } catch {}
}

function clearHistory() {
    items.value = [];
    localStorage.removeItem("sl-popup-history");
    new Notice("查词历史已清除");
}

function searchWord(w: string) {
    dispatchEvent(new CustomEvent("sl-search", { detail: { selection: w } }));
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

onMounted(loadHistory);
</script>

<style scoped>
.sl-history { padding: 8px; }
.sl-history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sl-history-header h3 { margin: 0; font-size: 0.95em; }
.sl-history-clear { background: none; border: none; cursor: pointer; font-size: 0.78em; color: var(--text-muted); text-decoration: underline; }
.sl-history-empty { text-align: center; color: var(--text-muted); padding: 24px; font-size: 0.85em; }
.sl-history-list { max-height: 400px; overflow-y: auto; }
.sl-history-item { display: flex; justify-content: space-between; padding: 4px 0; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border); }
.sl-history-item:hover { background: var(--background-secondary); }
.sl-history-word { font-weight: 500; font-size: 0.9em; }
.sl-history-time { font-size: 0.75em; color: var(--text-muted); }
</style>