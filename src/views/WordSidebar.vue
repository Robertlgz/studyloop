<template>
    <div class="sl-word-sidebar">
        <h3>当前文档词汇</h3>
        <div class="sl-sidebar-legend">
            <span v-for="(l, i) in labels" :key="i" :style="{ color: colors[i] }">{{ l }}</span>
        </div>
        <div class="sl-sidebar-list">
            <div v-for="w in words" :key="w.expression" class="sl-sidebar-item">
                <span class="sl-sidebar-word" :style="{ color: colors[w.status] }">{{ w.expression }}</span>
                <span class="sl-sidebar-status">{{ labels[w.status] }}</span>
            </div>
        </div>
        <div v-if="words.length === 0" class="sl-sidebar-empty">
            当前文档暂无可显示的词汇
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import type StudyLoop from "@/main";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const colors = ["#999", "#ff9800", "#ffeb3c", "#9eda58", "#4cb051"];
const labels = ["忽略", "学习中", "熟悉", "掌握", "精通"];

const words = computed(() => {
    // 从活动文档获取词列表
    // 简化版：返回所有词库中 status > 0 的词
    return plugin.wordStore.getAllWords()
        .filter(w => w.status > 0)
        .sort((a, b) => b.status - a.status)
        .slice(0, 50);
});
</script>

<style scoped>
.sl-word-sidebar { padding: 8px; }
.sl-word-sidebar h3 { margin: 0 0 8px 0; font-size: 0.9em; }
.sl-sidebar-legend { display: flex; gap: 4px; font-size: 0.75em; margin-bottom: 8px; flex-wrap: wrap; }
.sl-sidebar-list { max-height: 400px; overflow-y: auto; }
.sl-sidebar-item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 0.85em; }
.sl-sidebar-word { font-weight: 500; }
.sl-sidebar-status { font-size: 0.8em; }
.sl-sidebar-empty { text-align: center; color: var(--text-muted); padding: 24px; }
</style>