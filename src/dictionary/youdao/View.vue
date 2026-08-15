<template>
    <div id="youdao">
        <h2>{{ word }}</h2>
        <div class="pronunces">
            <span class="pron" v-for="(p, i) in prons" :key="i" @click="playAudio(p.url)">
                {{ p.phsym }}
            </span>
        </div>
        <div class="meaning" v-html="meaningHTML" />
        <div class="translation" v-html="translationHTML" />
        <div class="tabs" v-if="hasTabs">
            <button v-for="tab in tabsList" :key="tab" :class="{ active: curPanel === tab }"
                @click="curPanel = tab">{{ tab }}</button>
        </div>
        <div v-if="curPanel === '柯林斯'" class="collins" v-html="collinsHTML" />
        <div v-else-if="curPanel === '辨析'" class="discrimination" v-html="discriminationHTML" />
        <div v-else-if="curPanel === '词组'" class="word-group" v-html="wordGroupHTML" />
        <div v-else-if="curPanel === '同根词'" class="rel-word" v-html="relWordHTML" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { YoudaoEngine } from "./engine";
import { playAudio } from "@/utils/helpers";
import { useLoading } from "../uses";

const props = defineProps<{ word: string }>();
const emits = defineEmits<{ (e: "loading", s: { id: string; loading: boolean; result: boolean }): void }>();

let word = ref("");
let meaningHTML = ref("");
let translationHTML = ref("");
let prons = ref<Array<{ phsym: string; url: string }>>([]);
const tabsList = ["柯林斯", "辨析", "词组", "同根词"];
let curPanel = ref("柯林斯");
let collinsHTML = ref("");
let discriminationHTML = ref("");
let wordGroupHTML = ref("");
let relWordHTML = ref("");
let hasTabs = ref(false);

async function onSearch(): Promise<boolean> {
    try {
        const result = await YoudaoEngine.search(props.word);
        word.value = result.title;
        meaningHTML.value = result.meaningHTML;
        translationHTML.value = result.translationHTML;
        prons.value = result.prons;
        collinsHTML.value = result.collins?.map(c => `<div class="collins-entry"><h4>${c.title}</h4>${c.content}</div>`).join("") || "";
        discriminationHTML.value = result.discriminationHTML || "";
        wordGroupHTML.value = result.wordGroupHTML || "";
        relWordHTML.value = result.relWordHTML || "";
        hasTabs.value = !!(collinsHTML.value || discriminationHTML.value || wordGroupHTML.value || relWordHTML.value);
        await nextTick();
        return true;
    } catch {
        return false;
    }
}

useLoading(() => props.word, "youdao", onSearch, emits);
</script>

<style scoped>
#youdao h2 { font-size: 1.3em; font-weight: 700; }
.pronunces { margin-bottom: 8px; }
.pron { margin-right: 12px; color: deeppink; cursor: pointer; font-size: 1.1em; }
.meaning { margin-bottom: 10px; }
.tabs { display: flex; gap: 4px; margin: 8px 0; }
.tabs button { padding: 2px 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: transparent; cursor: pointer; }
.tabs button.active { background: var(--interactive-accent); color: white; }
</style>