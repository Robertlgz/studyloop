<template>
    <div id="hjdict">
        <h2>{{ word }}</h2>
        <div class="meaning" v-html="meaningHTML" />
        <div class="suggestions" v-if="suggestionsHTML" v-html="suggestionsHTML" />
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { HjdictEngine } from "./engine";
import { useLoading } from "../uses";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

let word = ref("");
let meaningHTML = ref("");
let suggestionsHTML = ref("");

async function onSearch(): Promise<boolean> {
    try {
        const result = await HjdictEngine.search(props.word);
        word.value = result.title;
        meaningHTML.value = result.meaningHTML;
        suggestionsHTML.value = result.suggestions || "";
        await nextTick();
        return true;
    } catch { return false; }
}
useLoading(() => props.word, "hjdict", onSearch, emits);
</script>