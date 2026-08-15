<template>
    <div id="deepl">
        <h2>{{ word }}</h2>
        <div class="translation" v-html="translationHTML" />
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { DeepLEngine } from "./engine";
import { useLoading } from "../uses";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

let word = ref("");
let translationHTML = ref("");

async function onSearch(): Promise<boolean> {
    try {
        const result = await DeepLEngine.search(props.word);
        word.value = result.title;
        translationHTML.value = result.translationHTML;
        await nextTick();
        return true;
    } catch { return false; }
}
useLoading(() => props.word, "deepl", onSearch, emits);
</script>