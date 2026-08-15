<template>
    <div class="sl-bilingual">
        <div class="sl-bilingual-toolbar">
            <button @click="toggleDisplay" class="sl-bilingual-btn">
                {{ displayMode === 'bilingual' ? '切换仅翻译' : '切换双语' }}
            </button>
            <select v-model="translationStyle" class="sl-bilingual-select">
                <option value="border">边框</option>
                <option value="quote">引用</option>
                <option value="muted">灰色</option>
                <option value="dashed">虚线下划线</option>
                <option value="mask">学习掩码</option>
            </select>
        </div>
        <div class="sl-bilingual-content">
            <div v-for="(block, i) in blocks" :key="i" class="sl-bilingual-block">
                <div class="sl-bilingual-original">{{ block.original }}</div>
                <div
                    v-if="block.translated && displayMode !== 'original-only'"
                    :class="['sl-bilingual-translation', 'sl-style-' + translationStyle]"
                    @mouseenter="onHover(block)"
                >
                    {{ block.translated }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import type StudyLoop from "@/main";
import { shouldSkipTranslation } from "@/utils/translation-skip";
import { TranslationCache } from "@/utils/translation-cache";

const props = defineProps<{
    text: string;
    targetLang?: string;
    dueWords?: string[];
}>();

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;
const displayMode = ref<"bilingual" | "translation-only" | "original-only">("bilingual");
const translationStyle = ref("mask");

const cache = new TranslationCache();

// 分段落
const blocks = computed(() => {
    const paragraphs = props.text.split("\n\n").filter(Boolean);
    return paragraphs.map(p => ({
        original: p,
        translated: shouldSkipTranslation(p, props.targetLang) ? null : (cache.get(p, props.targetLang || "zh-CN") || null),
        skipped: shouldSkipTranslation(p, props.targetLang),
    }));
});

function toggleDisplay() {
    if (displayMode.value === "bilingual") displayMode.value = "translation-only";
    else if (displayMode.value === "translation-only") displayMode.value = "original-only";
    else displayMode.value = "bilingual";
}

function onHover(block: any) {
    // 学习掩码悬停时的额外逻辑
}
</script>

<style scoped>
.sl-bilingual { padding: 8px; }
.sl-bilingual-toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
.sl-bilingual-btn { font-size: 0.8em; padding: 2px 8px; }
.sl-bilingual-select { font-size: 0.8em; }
.sl-bilingual-block { margin-bottom: 12px; }
.sl-bilingual-original { font-size: 1em; margin-bottom: 4px; }
.sl-bilingual-translation { font-size: 0.9em; color: var(--text-muted); }

/* 五种翻译样式 */
.sl-style-border { border-left: 3px solid var(--interactive-accent); padding-left: 8px; }
.sl-style-quote { border-left: 3px solid #888; padding-left: 8px; font-style: italic; }
.sl-style-muted { opacity: 0.7; }
.sl-style-dashed { text-decoration: underline dashed; text-decoration-color: var(--text-muted); }

/* 学习掩码 ★ 杀手特性 */
.sl-style-mask {
    filter: blur(4px);
    transition: filter 0.2s ease;
    cursor: pointer;
    user-select: none;
}
.sl-style-mask:hover {
    filter: none;
}
</style>