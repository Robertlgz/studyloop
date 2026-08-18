<template>
    <div id="sl-reading" ref="readingEl">
        <!-- 功能栏 -->
        <div class="sl-function-bar">
            <div class="sl-readability" v-if="readabilityLevel">
                📊 难度 {{ readabilityLevel }}
            </div>
            <div class="sl-count-bar" @click="toggleCountUnit">
                <span class="sl-bar-unknown" :style="{ flex: stats.unknown }">{{ displayCount(stats.unknown) }}</span>
                <span class="sl-bar-learn" :style="{ flex: stats.learn }">{{ displayCount(stats.learn) }}</span>
                <span class="sl-bar-ignore" :style="{ flex: stats.ignore }">{{ displayCount(stats.ignore) }}</span>
            </div>
            <button @click="toggleBilingual" class="sl-translate-btn" :disabled="translating">
                {{ translated ? '返回原文' : '双语翻译' }}
            </button>
        </div>

        <!-- 阅读区 / 双语区 -->
        <div v-if="!translated" class="sl-text-area" :style="textStyle" v-html="renderedText" @click="onWordClick" />
        <div v-else class="sl-bilingual-area">
            <BilingualView ref="bilingualRef" :text="currentPageText" />
        </div>

        <!-- 分页 -->
        <div class="sl-pagination">
            <button @click="prevPage" :disabled="page <= 1">&lt; 上一页</button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="page >= totalPages">下一页 &gt;</button>
        </div>

        <!-- 迷你复习弹出 -->
        <div v-if="reviewWord" class="sl-mini-review" :style="reviewPos">
            <div class="sl-review-word">{{ reviewWord.expression }}</div>
            <button @click="toggleReviewMeaning">{{ showReviewMeaning ? reviewWord.meaning : '点击显示释义' }}</button>
            <div class="sl-review-btns" v-if="showReviewMeaning">
                <button v-for="(label, i) in ['Again', 'Hard', 'Good', 'Easy']" :key="i"
                    @click="rateReview(i + 1)" :class="'sl-rate-' + i">{{ label }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, getCurrentInstance, nextTick } from "vue";
import { Notice, Platform } from "obsidian";
import type StudyLoop from "@/main";
import type { ReadingView } from "./ReadingView";
import { TextParser } from "@/parser/index";
import store from "@/store";
import BilingualView from "./BilingualView.vue";
import { calculateNextDue, getDueWords } from "@/scheduling/fsrs";

const vueThis = getCurrentInstance()!;
const view = vueThis.appContext.config.globalProperties.view as ReadingView;
const plugin = vueThis.appContext.config.globalProperties.plugin as StudyLoop;

const parser = new TextParser();

// 读取文本
const lines = view.text.split("\n");
const segments = view.divide(lines);
const article = lines.slice(segments["article"]?.start || 0, segments["article"]?.end || lines.length);
const totalLines = article.length;

// 分页
const pageSize = ref(8);
const page = ref(1);
const totalPages = computed(() => Math.ceil(totalLines / pageSize.value));

function prevPage() { if (page.value > 1) page.value--; }
function nextPage() { if (page.value < totalPages.value) page.value++; }

// 渲染文本
const renderedText = ref("");
const readabilityLevel = ref("");
const stats = ref({ unknown: 0, learn: 0, ignore: 0 });
const isPercent = ref(true);

function displayCount(n: number) {
    if (isPercent.value) {
        const total = stats.value.unknown + stats.value.learn + stats.value.ignore;
        return total > 0 ? Math.round(n / total * 100) + "%" : "0%";
    }
    return n;
}
function toggleCountUnit() { isPercent.value = !isPercent.value; }

// 难度
const textStyle = computed(() => ({
    fontSize: store.fontSize || "15px",
    fontFamily: store.fontFamily || '"Times New Roman"',
    lineHeight: store.lineHeight || "1.8em",
}));

// 双语模式
const translated = ref(false);
const translating = ref(false);
const bilingualRef = ref<any>(null);

const currentPageText = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return article.slice(start, start + pageSize.value).join("\n");
});

async function toggleBilingual() {
    if (translated.value) {
        translated.value = false;
        await renderCurrentPage();
        return;
    }
    translated.value = true;
    // BilingualView 自身 onMounted 会翻译，这里无需额外处理
}

// 渲染当前页
async function renderCurrentPage() {
    const start = (page.value - 1) * pageSize.value;
    const end = Math.min(start + pageSize.value, totalLines);
    const text = article.slice(start, end).join("\n");

    // 从词库获取单词状态
    const wordStatuses = plugin.wordStore.getAllWords().map(w => ({
        text: w.expression,
        status: w.status,
    }));

    renderedText.value = await parser.parse(text, wordStatuses);

    // 统计
    stats.value = await parser.countWords(text, wordStatuses);

    // 难度
    readabilityLevel.value = parser.calcReadability(text).level;
}

watch([page, pageSize], () => {
    if (translated.value) translated.value = false;
    renderCurrentPage();
}, { immediate: true });

// 迷你复习
const reviewWord = ref<{ expression: string; meaning: string; fsrs: any } | null>(null);
const showReviewMeaning = ref(false);
const reviewPos = ref({ top: "0px", left: "0px" });

function onWordClick(evt: MouseEvent) {
    if (translated.value) return; // 双语模式下不触发迷你复习
    const target = evt.target as HTMLElement;
    if (target.hasClass("sl-word") || target.hasClass("sl-phrase")) {
        const word = target.textContent?.trim() || "";
        const stored = plugin.wordStore.getWord(word);
        if (stored) {
            reviewWord.value = { expression: stored.expression, meaning: stored.meaning, fsrs: stored.fsrs };
            showReviewMeaning.value = false;
            reviewPos.value = { top: `${evt.clientY + 10}px`, left: `${Math.max(0, evt.clientX - 100)}px` };
        } else {
            dispatchEvent(new CustomEvent("sl-search", { detail: { selection: word } }));
        }
    } else {
        reviewWord.value = null;
    }
}

function toggleReviewMeaning() {
    showReviewMeaning.value = !showReviewMeaning.value;
}

function rateReview(rating: 1 | 2 | 3 | 4) {
    if (!reviewWord.value) return;
    const word = reviewWord.value.expression;
    const stored = plugin.wordStore.getWord(word);
    if (!stored) {
        reviewWord.value = null;
        showReviewMeaning.value = false;
        return;
    }

    const prevConsecutive = stored.fsrs.consecutiveGood || 0;
    const { card: newCard, status } = calculateNextDue(stored.fsrs, rating, prevConsecutive);

    // 更新词库
    plugin.wordStore.updateWord(word, {
        fsrs: newCard,
        status,
    });
    // 打卡 streak
    plugin.wordStore.checkInReview();

    // 记录复习日志
    plugin.wordStore.addReviewLog({
        word,
        rating,
        date: Math.floor(Date.now() / 1000),
        elapsedDays: 0,
        scheduledDays: newCard.interval || 1,
    });

    reviewWord.value = null;
    showReviewMeaning.value = false;
    new Notice(`已记录: ${word} - ${["Again","Hard","Good","Easy"][rating - 1]}`);
}
</script>

<style scoped>
#sl-reading { height: 100%; display: flex; flex-direction: column; user-select: none; }
.sl-function-bar { display: flex; align-items: center; gap: 8px; padding: 4px; border-bottom: 1px solid var(--background-modifier-border); }
.sl-readability { font-size: 0.8em; color: var(--text-muted); }
.sl-count-bar { display: flex; flex: 1; height: 16px; border: 1px solid var(--background-modifier-border); border-radius: 8px; overflow: hidden; cursor: pointer; }
.sl-bar-unknown { background: #add8e6; text-align: center; font-size: 0.7em; color: #333; }
.sl-bar-learn { background: #ff9800; text-align: center; font-size: 0.7em; color: #333; }
.sl-bar-ignore { background: #ddd; text-align: center; font-size: 0.7em; color: #333; }
.sl-translate-btn { font-size: 0.8em; padding: 2px 8px; }
.sl-text-area { flex: 1; overflow: auto; padding: 8px; }
.sl-text-area :deep(.sl-word) { cursor: pointer; border: 1px solid transparent; border-radius: 4px; }
.sl-text-area :deep(.sl-word:hover) { border-color: deepskyblue; }
.sl-text-area :deep(.sl-word.new) { background: #add8e644; }
.sl-text-area :deep(.sl-word.learning) { background: #ff980055; }
.sl-text-area :deep(.sl-word.familiar) { background: #ffeb3c55; }
.sl-text-area :deep(.sl-word.known) { background: #9eda5855; }
.sl-text-area :deep(.sl-word.learned) { background: #4cb05155; }
.sl-bilingual-area { flex: 1; overflow: auto; }
.sl-pagination { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 4px; }
.sl-mini-review { position: fixed; z-index: 1000; background: var(--background-primary); border: 1px solid var(--interactive-accent); border-radius: 8px; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.sl-review-word { font-weight: bold; font-size: 1.1em; margin-bottom: 4px; }
.sl-review-btns { display: flex; gap: 4px; margin-top: 4px; }
.sl-review-btns button { font-size: 0.8em; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--background-modifier-border); }
.sl-rate-0 { color: #e74c3c; }
.sl-rate-1 { color: #e67e22; }
.sl-rate-2 { color: #27ae60; }
.sl-rate-3 { color: #2980b9; }
</style>
