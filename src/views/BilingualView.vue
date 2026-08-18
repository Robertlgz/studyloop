<template>
    <div class="sl-bilingual">
        <div class="sl-bilingual-toolbar">
            <div class="sl-bilingual-stats" v-if="translating">正在翻译…</div>
            <div class="sl-bilingual-stats" v-else-if="translated">✓ 已翻译 {{ translatedCount }} 段</div>
            <div class="sl-bilingual-stats" v-else>共 {{ blocks.length }} 段</div>
            <button @click="cycleDisplayMode" class="sl-bilingual-btn">{{ modeLabel }}</button>
            <select v-model="translationStyle" class="sl-bilingual-select">
                <option value="border">边框</option>
                <option value="quote">引用</option>
                <option value="muted">灰色</option>
                <option value="dashed">虚线下划线</option>
                <option value="mask">学习掩码</option>
            </select>
            <button @click="$emit('back')" class="sl-bilingual-btn sl-bilingual-back-btn">返回原文</button>
        </div>
        <div class="sl-bilingual-content">
            <div v-for="(block, i) in visibleBlocks" :key="i" class="sl-bilingual-block">
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
import { ref, computed, onMounted, watch, getCurrentInstance } from "vue";
import { Notice } from "obsidian";
import type StudyLoop from "@/main";
import { shouldSkipTranslation } from "@/utils/translation-skip";
import { translateText } from "@/utils/translation";

const props = defineProps<{
    text: string;
    targetLang?: string;
}>();

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const displayMode = ref<"bilingual" | "translation-only" | "original-only">(
    plugin.settings.translation_display_mode || "bilingual",
);
const translationStyle = ref(plugin.settings.translation_style || "mask");
const translating = ref(false);
const translatedCount = ref(0);

const blocks = ref<Array<{ original: string; translated: string | null; skipped: boolean }>>([]);

const visibleBlocks = computed(() => {
    if (displayMode.value === "original-only") {
        return blocks.value.map(b => ({ ...b, translated: null }));
    }
    return blocks.value;
});

const modeLabel = computed(() => {
    const map = { "bilingual": "双语", "translation-only": "仅翻译", "original-only": "仅原文" };
    return map[displayMode.value];
});

function cycleDisplayMode() {
    if (displayMode.value === "bilingual") displayMode.value = "translation-only";
    else if (displayMode.value === "translation-only") displayMode.value = "original-only";
    else displayMode.value = "bilingual";
}

function onHover(_block: any) {
    // mask style handles hover in CSS
}

async function translateAll() {
    if (!props.text) return;
    const paragraphs = props.text.split(/\n\n+/).filter(Boolean);
    blocks.value = [];
    translatedCount.value = 0;
    translating.value = true;
    try {
        const backend = plugin.settings.translation_backend || "mymemory";
        const cfg = {
            backend,
            apiKey: plugin.settings.ai_api_key || undefined,
            baseUrl: plugin.settings.ai_provider || undefined,
            model: plugin.settings.ai_model || undefined,
            targetLang: props.targetLang || "zh-CN",
        };
        for (const para of paragraphs) {
            if (shouldSkipTranslation(para, cfg.targetLang)) {
                blocks.value.push({ original: para, translated: null, skipped: true });
                continue;
            }
            // 先查缓存
            const cached = plugin.wordStore.getTranslation(para, cfg.targetLang);
            if (cached) {
                blocks.value.push({ original: para, translated: cached, skipped: false });
                translatedCount.value++;
                continue;
            }
            try {
                const result = await translateText(para, cfg);
                plugin.wordStore.setTranslation(para, result, backend, cfg.targetLang);
                blocks.value.push({ original: para, translated: result, skipped: false });
                translatedCount.value++;
            } catch {
                blocks.value.push({ original: para, translated: null, skipped: true });
            }
        }
    } finally {
        translating.value = false;
    }
}

onMounted(() => {
    translateAll();
});

watch(() => props.text, () => translateAll());

defineExpose({ translateAll });
</script>

<style scoped>
.sl-bilingual { padding: 8px; display: flex; flex-direction: column; height: 100%; }
.sl-bilingual-toolbar { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
.sl-bilingual-btn { font-size: 0.8em; padding: 2px 8px; cursor: pointer; }
.sl-bilingual-select { font-size: 0.8em; }
.sl-bilingual-back-btn { margin-left: auto; }
.sl-bilingual-stats { font-size: 0.8em; color: var(--text-muted); }
.sl-bilingual-content { flex: 1; overflow-y: auto; }
.sl-bilingual-block { margin-bottom: 12px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px; }
.sl-bilingual-original { font-size: 1em; margin-bottom: 4px; }
.sl-bilingual-translation { font-size: 0.9em; color: var(--text-muted); }

/* 五种翻译样式 */
.sl-style-border { border-left: 3px solid var(--interactive-accent); padding-left: 8px; }
.sl-style-quote { border-left: 3px solid #888; padding-left: 8px; font-style: italic; }
.sl-style-muted { opacity: 0.7; }
.sl-style-dashed { text-decoration: underline dashed; text-decoration-color: var(--text-muted); }

/* 学习掩码 */
.sl-style-mask {
    filter: blur(4px);
    transition: filter 0.2s ease;
    cursor: pointer;
    user-select: none;
}
.sl-style-mask:hover { filter: none; }
</style>
