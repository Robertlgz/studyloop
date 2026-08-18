<template>
    <div class="sl-today">
        <div class="sl-today-card" v-if="!started">
            <h2>📚 今日学习</h2>
            <div class="sl-today-stats">
                <div>📖 待复习: <strong>{{ dueCount }}</strong> 个词</div>
                <div>📥 今日新增: <strong>{{ todayNew }}</strong> 个词</div>
                <div>🔥 连续学习: <strong>{{ streak }}</strong> 天</div>
            </div>
            <button @click="startReview" class="sl-today-btn" :disabled="dueCount === 0">
                {{ dueCount > 0 ? '开始复习' : '🎉 没有待复习的词' }}
            </button>
            <div class="sl-today-tips" v-if="dueCount === 0">
                <p>建议：读一篇新文章，添加生词。</p>
            </div>
        </div>
        <div class="sl-today-card" v-else>
            <h2>⌛ 复习中...</h2>
            <p>已复习 {{ reviewed }} / {{ dueCount }} 个词</p>
            <button @click="finishReview" class="sl-today-btn">完成复习</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import type StudyLoop from "@/main";
import { getDueWords } from "@/scheduling/fsrs";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const started = ref(false);
const reviewed = ref(0);

const dueCount = computed(() => getDueWords(plugin.wordStore.getAllWords()).length);
const todayNew = computed(() => {
    const today = new Date().toISOString().split("T")[0];
    return plugin.wordStore.getAllWords().filter(w => {
        return w.date && new Date(w.date * 1000).toISOString().split("T")[0] === today;
    }).length;
});
const streak = computed(() => plugin.wordStore.getStreak());

function startReview() {
    started.value = true;
    reviewed.value = 0;
    const app = (plugin as any).app;
    app.commands.executeCommandById("studyloop:review-due-cards");
}

function finishReview() {
    started.value = false;
    reviewed.value += 10;
}
</script>

<style scoped>
.sl-today { padding: 16px; display: flex; justify-content: center; }
.sl-today-card { max-width: 400px; width: 100%; padding: 24px; border: 1px solid var(--background-modifier-border); border-radius: 12px; text-align: center; }
.sl-today-card h2 { margin: 0 0 16px 0; }
.sl-today-stats { text-align: left; margin-bottom: 16px; }
.sl-today-stats div { padding: 4px 0; font-size: 0.95em; }
.sl-today-btn { width: 100%; padding: 10px; background: var(--interactive-accent); color: white; border: none; border-radius: 6px; font-size: 1em; cursor: pointer; }
.sl-today-btn:disabled { opacity: 0.5; cursor: default; }
.sl-today-tips { margin-top: 12px; font-size: 0.85em; color: var(--text-muted); }
</style>
