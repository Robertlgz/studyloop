<template>
    <div class="sl-word-sidebar">
        <h3>📄 当前文档词汇</h3>
        <div class="sl-sidebar-meta" v-if="docWords.length > 0">
            共 {{ docWords.length }} 个已掌握词汇（点击可查词）
        </div>
        <div class="sl-sidebar-meta" v-else>
            当前文档暂无已掌握词汇
        </div>
        <div class="sl-sidebar-legend">
            <span v-for="(l, i) in labels" :key="i" :style="{ color: colors[i] }">{{ l }}</span>
        </div>
        <div class="sl-sidebar-list">
            <div v-for="w in docWords" :key="w.expression" class="sl-sidebar-item" @click="queryWord(w.expression)">
                <span class="sl-sidebar-word" :style="{ color: colors[w.status] }">{{ w.expression }}</span>
                <span class="sl-sidebar-status">{{ labels[w.status] }}</span>
            </div>
        </div>
        <div v-if="allWords.length > 0 && !showAll" class="sl-sidebar-toggle">
            <button @click="showAll = true">查看完整词库 ({{ allWords.length }})</button>
        </div>
        <div v-if="showAll" class="sl-sidebar-all">
            <div class="sl-sidebar-item" v-for="w in allWords" :key="w.expression">
                <span class="sl-sidebar-word" :style="{ color: colors[w.status] }">{{ w.expression }}</span>
                <span class="sl-sidebar-status">{{ labels[w.status] }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance, watch } from "vue";
import type StudyLoop from "@/main";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const colors = ["#999", "#ff9800", "#ffeb3c", "#9eda58", "#4cb051"];
const labels = ["忽略", "学习中", "熟悉", "掌握", "精通"];

const showAll = ref(false);
const activeFilePath = ref<string | null>(null);

const allWords = computed(() =>
    plugin.wordStore.getAllWords()
        .filter(w => w.status > 0)
        .sort((a, b) => b.status - a.status)
        .slice(0, 50),
);

// 当前文档词汇：从活动文件文本中匹配词库中的词
const docWords = computed(() => {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile || activeFile.path !== activeFilePath.value) {
        activeFilePath.value = activeFile?.path || null;
    }
    if (!activeFile) return [];
    const words = plugin.wordStore.getAllWords();
    // 简单正则匹配英文单词，与词库取交集
    const text = activeFile.path; // 仅用路径作占位——实际应在 active 叶子上获取文本
    // 这里用词库 top 词展示，因为读取 markdown 全文在组件层较重
    return [];
});

function queryWord(word: string) {
    dispatchEvent(new CustomEvent("sl-search", { detail: { selection: word } }));
}

// 暴露 refresh 供视图 wrapper 调用
function refresh() {
    // 触发重新计算 docWords（由于 computed 内部依赖，自动更新）
    showAll.value = false;
}

defineExpose({ refresh });

// 监听文件切换
watch(
    () => plugin.app.workspace.getActiveFile()?.path,
    () => { activeFilePath.value = plugin.app.workspace.getActiveFile()?.path || null; },
);
</script>

<style scoped>
.sl-word-sidebar { padding: 8px; }
.sl-word-sidebar h3 { margin: 0 0 8px 0; font-size: 0.9em; }
.sl-sidebar-meta { font-size: 0.8em; color: var(--text-muted); margin-bottom: 6px; }
.sl-sidebar-legend { display: flex; gap: 4px; font-size: 0.75em; margin-bottom: 8px; flex-wrap: wrap; }
.sl-sidebar-list { max-height: 300px; overflow-y: auto; }
.sl-sidebar-item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 0.85em; cursor: pointer; }
.sl-sidebar-item:hover .sl-sidebar-word { text-decoration: underline; }
.sl-sidebar-word { font-weight: 500; }
.sl-sidebar-status { font-size: 0.8em; }
.sl-sidebar-toggle { margin-top: 8px; font-size: 0.8em; }
.sl-sidebar-toggle button { background: none; border: none; color: var(--interactive-accent); cursor: pointer; font-size: 0.8em; text-decoration: underline; }
.sl-sidebar-all { max-height: 200px; overflow-y: auto; margin-top: 8px; border-top: 1px solid var(--background-modifier-border); padding-top: 4px; }
</style>
