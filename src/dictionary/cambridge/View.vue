<template>
    <div id="cambridge">
        <h2>{{ word }}</h2>
        <div class="pronunces">
            <span class="pron" v-for="(p, i) in prons" :key="i" @click="playAudio(p.url)">{{ p.phsym }}</span>
        </div>
        <div class="meaning" v-html="meaningHTML" />
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { CambridgeEngine } from "./engine";
import { playAudio } from "@/utils/helpers";
import { useLoading } from "../uses";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

let word = ref("");
let meaningHTML = ref("");
let prons = ref<Array<{ phsym: string; url: string }>>([]);

async function onSearch(): Promise<boolean> {
    try {
        const result = await CambridgeEngine.search(props.word);
        word.value = result.title;
        meaningHTML.value = result.meaningHTML;
        prons.value = result.prons;
        await nextTick();
        return true;
    } catch { return false; }
}
useLoading(() => props.word, "cambridge", onSearch, emits);
</script>