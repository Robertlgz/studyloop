<template>
    <div class="sl-review-queue">
        <h3>复习队列</h3>
        <div class="sl-queue-stats">
            <span>今日待复习: {{ dueCount }}</span>
            <span>总词库: {{ totalCount }}</span>
        </div>
        <div class="sl-queue-list">
            <div v-for="w in dueWords" :key="w.expression" class="sl-queue-item">
                <span class="sl-queue-word">{{ w.expression }}</span>
                <span class="sl-queue-status" :class="'sl-s-' + w.status">{{ statusLabel(w.status) }}</span>
            </div>
        </div>
        <div v-if="dueWords.length === 0" class="sl-queue-empty">
            🎉 没有待复习的词
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import type StudyLoop from "@/main";
import { getDueWords } from "@/scheduling/fsrs";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const statusLabels = ["忽略", "学习中", "熟悉", "掌握", "精通"];
function statusLabel(s: number) { return statusLabels[s] || ""; }

const dueWords = computed(() => getDueWords(plugin.wordStore.getAllWords()));
const dueCount = computed(() => dueWords.value.length);
const totalCount = computed(() => plugin.wordStore.getAllWords().length);

// 监听刷新事件
onMounted(() => {
    addEventListener("sl-refresh", () => {
        // 强制重新计算
    });
});
</script>

<style scoped>
.sl-review-queue { padding: 8px; }
.sl-review-queue h3 { margin: 0 0 8px 0; font-size: 1em; }
.sl-queue-stats { display: flex; gap: 8px; font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px; }
.sl-queue-list { max-height: 300px; overflow-y: auto; }
.sl-queue-item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 0.85em; }
.sl-queue-word { font-weight: 500; }
.sl-queue-status { font-size: 0.8em; }
.sl-s-1 { color: #ff9800; }
.sl-s-2 { color: #ffeb3c; }
.sl-s-3 { color: #9eda58; }
.sl-s-4 { color: #4cb051; }
.sl-queue-empty { text-align: center; color: var(--text-muted); padding: 24px; }
</style>