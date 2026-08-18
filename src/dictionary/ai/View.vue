<template>
    <div id="ai-dict">
        <h2>{{ word }}</h2>
        <div class="meaning" v-html="meaningHTML" v-if="meaningHTML" />
        <div class="no-key" v-else-if="!hasKey">
            <span class="ai-hint">请先在设置中配置 AI API Key 以使用 AI 释义</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from "vue";
import { AiEngine } from "./engine";
import { useLoading } from "../uses";
import type StudyLoop from "@/main";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;
const hasKey = ref(!!plugin.settings.ai_api_key);
const meaningHTML = ref("");

watch(() => plugin.settings.ai_api_key, (v) => { hasKey.value = !!v; });

async function onSearch(): Promise<boolean> {
    if (!plugin.settings.ai_api_key) return false;
    try {
        const result = await AiEngine.search(props.word, {
            aiApiKey: plugin.settings.ai_api_key,
            aiProvider: plugin.settings.ai_provider,
            aiModel: plugin.settings.ai_model,
        });
        meaningHTML.value = result.meaningHTML || "";
        return !!result.meaningHTML;
    } catch {
        meaningHTML.value = "";
        return false;
    }
}

useLoading(() => props.word, "ai", onSearch, emits);
</script>

<style scoped>
#ai-dict h2 { font-size: 1.2em; margin: 0 0 6px 0; }
.meaning { font-size: 0.9em; line-height: 1.5; white-space: pre-wrap; }
.no-key { padding: 8px; font-size: 0.85em; color: var(--text-muted); }
.ai-hint { font-style: italic; }
</style>
