<template>
    <div class="sl-stat">
        <h2>统计</h2>

        <!-- 概览 -->
        <div class="sl-stat-overview">
            <div class="sl-stat-card">
                <div class="sl-stat-value">{{ stats.total }}</div>
                <div class="sl-stat-label">总词库</div>
            </div>
            <div class="sl-stat-card">
                <div class="sl-stat-value">{{ stats.due }}</div>
                <div class="sl-stat-label">待复习</div>
            </div>
            <div class="sl-stat-card">
                <div class="sl-stat-value">{{ stats.today }}</div>
                <div class="sl-stat-label">今日新增</div>
            </div>
            <div class="sl-stat-card">
                <div class="sl-stat-value">{{ streak }}</div>
                <div class="sl-stat-label">连续天数🔥</div>
            </div>
        </div>

        <!-- 状态分布 -->
        <h3>掌握度分布</h3>
        <div class="sl-stat-bars">
            <div v-for="(item, i) in statusData" :key="i" class="sl-stat-bar-row">
                <span class="sl-stat-bar-label">{{ item.label }}</span>
                <div class="sl-stat-bar-track">
                    <div class="sl-stat-bar-fill" :style="{ width: item.pct + '%', background: item.color }">
                        {{ item.value }}
                    </div>
                </div>
            </div>
        </div>

        <!-- 曝光追踪 -->
        <h3>曝光追踪</h3>
        <div class="sl-stat-exposure" v-if="exposureWords.length > 0">
            <div v-for="w in exposureWords.slice(0, 10)" :key="w.expression" class="sl-stat-exposure-item">
                <span class="sl-stat-exposure-word">{{ w.expression }}</span>
                <span class="sl-stat-exposure-count">已见 {{ w.exposures || 0 }} 次</span>
            </div>
        </div>
        <div v-else class="sl-stat-empty">暂无曝光数据（需要阅读视图）</div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import type StudyLoop from "@/main";
import { getDueWords } from "@/scheduling/fsrs";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const colors = ["#ddd", "#ff9800", "#ffeb3c", "#9eda58", "#4cb051"];
const labels = ["忽略", "学习中", "熟悉", "掌握", "精通"];

const stats = computed(() => {
    const words = plugin.wordStore.getAllWords();
    const due = plugin.wordStore.getDueWords().length;
    const today = new Date().toISOString().split("T")[0];
    const todayNew = words.filter(w => {
        if (!w.date) return false;
        return new Date(w.date * 1000).toISOString().split("T")[0] === today;
    }).length;
    return { total: words.length, due, today: todayNew };
});

const streak = computed(() => {
    return plugin.wordStore["reviewStreak"]?.current || 0;
});

const statusData = computed(() => {
    const words = plugin.wordStore.getAllWords();
    const counts = [0, 0, 0, 0, 0];
    for (const w of words) {
        if (w.status >= 0 && w.status <= 4) counts[w.status]++;
    }
    const total = words.length || 1;
    return counts.map((c, i) => ({
        label: labels[i],
        value: c,
        pct: Math.round(c / total * 100),
        color: colors[i],
    })).filter(d => d.value > 0);
});

const exposureWords = computed(() => {
    return plugin.wordStore.getAllWords()
        .filter(w => (w.exposures || 0) > 0)
        .sort((a, b) => (b.exposures || 0) - (a.exposures || 0));
});
</script>

<style scoped>
.sl-stat { padding: 8px; font-size: 0.9em; }
.sl-stat h2 { margin: 0 0 8px 0; }
.sl-stat-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.sl-stat-card { padding: 12px; border: 1px solid var(--background-modifier-border); border-radius: 8px; text-align: center; }
.sl-stat-value { font-size: 1.8em; font-weight: bold; }
.sl-stat-label { font-size: 0.8em; color: var(--text-muted); }
.sl-stat-bars { margin-bottom: 16px; }
.sl-stat-bar-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.sl-stat-bar-label { width: 60px; font-size: 0.85em; }
.sl-stat-bar-track { flex: 1; height: 20px; background: var(--background-secondary); border-radius: 4px; overflow: hidden; }
.sl-stat-bar-fill { height: 100%; display: flex; align-items: center; padding: 0 4px; font-size: 0.75em; color: #333; white-space: nowrap; }
.sl-stat-exposure-item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 0.85em; }
.sl-stat-exposure-word { font-weight: 500; }
.sl-stat-exposure-count { color: var(--text-muted); }
.sl-stat-empty { text-align: center; color: var(--text-muted); padding: 16px; }
</style>