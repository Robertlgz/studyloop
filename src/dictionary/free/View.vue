<template>
    <div id="free-dict">
        <h2>{{ word }}</h2>
        <div class="translation" v-html="translationHTML" v-if="translationHTML" />
        <div class="no-result" v-else>暂无翻译结果</div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { FreeEngine } from "./engine";
import { useLoading } from "../uses";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

const translationHTML = ref("");

async function onSearch(): Promise<boolean> {
    try {
        const result = await FreeEngine.search(props.word);
        translationHTML.value = result.translationHTML || "";
        return !!result.translationHTML;
    } catch {
        translationHTML.value = "";
        return false;
    }
}

useLoading(() => props.word, "free", onSearch, emits);
</script>

<style scoped>
#free-dict h2 { font-size: 1.2em; margin: 0 0 6px 0; }
.translation { font-size: 0.9em; color: var(--text-muted); font-style: italic; }
.no-result { font-size: 0.85em; color: var(--text-muted); padding: 4px 0; }
</style>
