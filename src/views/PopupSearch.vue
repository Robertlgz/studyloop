<template>
    <div
        class="sl-popup-search"
        :style="popupStyle"
        @click.stop
    >
        <!-- 顶部：词头 + 快捷操作 -->
        <div class="sl-popup-head">
            <div class="sl-word-row">
                <span class="sl-popup-word">{{ word }}</span>
                <span v-if="phonetic" class="sl-phonetic">{{ phonetic }}</span>
            </div>
            <div class="sl-head-actions">
                <button v-if="pronUrl" @click="playAudio(pronUrl)" class="sl-btn-icon" title="播放发音">🔊</button>
                <button @click="copyWord" class="sl-btn-icon" title="复制单词">📋</button>
                <button @click="addToDeck" class="sl-btn-add" :disabled="adding">{{ adding ? '✓' : '+ 加入词库' }}</button>
                <button @click="close" class="sl-btn-close">✕</button>
            </div>
        </div>

        <!-- 来源筛选 tabs -->
        <div class="sl-source-tabs" v-if="results.length > 1">
            <button v-for="src in results" :key="src.engine.id"
                :class="['sl-tab', { active: activeSource === src.engine.id }]"
                @click="activeSource = src.engine.id">
                {{ src.engine.name }}
            </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading && results.length === 0" class="sl-status">
            <span class="sl-spinner"></span> 查询中…
        </div>
        <div v-else-if="error && results.length === 0" class="sl-status sl-error">{{ error }}</div>

        <!-- 结果列表 -->
        <div class="sl-popup-body" v-else>
            <div v-for="src in results" :key="src.engine.id"
                class="sl-source-card"
                :class="{ collapsed: activeSource !== 'all' && activeSource !== src.engine.id }">
                <div class="sl-card-header" @click="toggleSource(src.engine.id)">
                    <span class="sl-source-tag" :class="'sl-src-' + src.engine.id">{{ src.engine.name }}</span>
                    <span class="sl-card-status" :class="{ ok: src.ok, err: !src.ok }">{{ src.ok ? '✓' : '—' }}</span>
                    <span class="sl-card-arrow">{{ src.expanded ? '▲' : '▼' }}</span>
                </div>
                <div v-if="src.ok && src.expanded" class="sl-card-body">
                    <div v-if="src.result.prons?.length" class="sl-prons">
                        <span v-for="(p, i) in src.result.prons" :key="i" class="sl-pron" @click.stop="playAudio(p.url)">
                            {{ p.phsym }} 🔊
                        </span>
                    </div>
                    <div v-if="src.result.meaningHTML" class="sl-meaning" v-html="src.result.meaningHTML"></div>
                    <div v-if="src.result.translationHTML" class="sl-translation" v-html="src.result.translationHTML"></div>
                    <div v-if="src.result.collins?.length" class="sl-collins">
                        <div v-for="(c, i) in src.result.collins" :key="i" class="sl-collins-entry">
                            <strong>{{ c.title }}</strong>
                            <div class="sl-collins-content" v-html="c.content"></div>
                        </div>
                    </div>
                    <div v-if="src.result.relWordHTML" class="sl-relword" v-html="src.result.relWordHTML"></div>
                    <div v-if="src.result.suggestions" class="sl-suggestions" v-html="src.result.suggestions"></div>
                    <div class="sl-card-actions">
                        <button @click="copyMeaning(src)" class="sl-btn-sm">复制释义</button>
                        <button @click="addToDeckFromSource(src.engine.id)" class="sl-btn-sm sl-btn-accent">加入词库</button>
                    </div>
                </div>
                <div v-else-if="!src.ok" class="sl-card-empty">暂无结果</div>
            </div>
            <div v-if="results.length > 0 && !results.some(r => r.ok)" class="sl-no-result">所有词典源均未返回结果</div>
        </div>

        <!-- 底部：全部展开/收起 -->
        <div class="sl-popup-footer" v-if="results.length > 1">
            <button @click="toggleAll" class="sl-footer-btn">{{ allExpanded ? '收起全部' : '展开全部' }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { Notice, clipboardCopy } from "obsidian";
import type StudyLoop from "@/main";
import { searchAllParallel } from "@/dictionary/list";
import type { SourceResult } from "@/dictionary/list";
import { createInitialCard } from "@/scheduling/fsrs";
import type { Word } from "@/db/word-store";

const plugin = getCurrentInstance()!.appContext.config.globalProperties.plugin as StudyLoop;

const word = ref("");
const pos = ref({ x: 100, y: 100 });
const loading = ref(false);
const error = ref("");
const adding = ref(false);

interface SourceItem extends SourceResult {
    expanded: boolean;
    ok: boolean;
}
const results = ref<SourceItem[]>([]);
const activeSource = ref<string>("all");

const phonetic = computed(() => {
    const first = results.value.find(r => r.result.prons?.length);
    return first?.result.prons?.[0]?.phsym || "";
});
const pronUrl = computed(() => {
    const first = results.value.find(r => r.result.prons?.length);
    return first?.result.prons?.[0]?.url || "";
});
const allExpanded = computed(() => results.value.every(r => r.expanded));

const popupStyle = computed(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = pos.value.x, y = pos.value.y;
    if (x + 400 > vw) x = vw - 408;
    if (y + 520 > vh) y = vh - 528;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    return { left: x + "px", top: y + "px" };
});

async function onSearch(evt: CustomEvent) {
    const detail = evt.detail as { selection: string; position?: { x: number; y: number } };
    word.value = detail.selection;
    pos.value = detail.position || { x: window.innerWidth - 420, y: 80 };
    results.value = [];
    loading.value = true;
    error.value = "";
    activeSource.value = "all";
    try {
        const enabled = Object.keys(plugin.settings.dictionaries).filter(id => plugin.settings.dictionaries[id].enable);
        const raw = await searchAllParallel(word.value, enabled, {
            aiApiKey: plugin.settings.ai_api_key,
            aiProvider: plugin.settings.ai_provider,
            aiModel: plugin.settings.ai_model,
        });
        const priority = ["youdao", "cambridge", "hjdict", "deepl", "ai", "free"];
        raw.sort((a, b) => priority.indexOf(a.engine.id) - priority.indexOf(b.engine.id));
        results.value = raw.map(r => ({ ...r, expanded: true, ok: !!(r.result.meaningHTML || r.result.translationHTML) }));
        if (results.value.length === 0) error.value = "未找到该词的释义";
    } catch (e) {
        error.value = "查询失败：" + ((e as Error).message || e);
    } finally {
        loading.value = false;
    }
}

function toggleSource(id: string) {
    const item = results.value.find(r => r.engine.id === id);
    if (item) item.expanded = !item.expanded;
}
function toggleAll() {
    const next = !allExpanded.value;
    results.value.forEach(r => { r.expanded = next; });
}
function playAudio(url: string) { try { new Audio(url).play(); } catch {} }

async function copyWord() {
    try { await clipboardCopy(word.value); new Notice("已复制单词"); } catch {}
}
async function copyMeaning(src: SourceItem) {
    const tmp = document.createElement("div");
    tmp.innerHTML = src.result.meaningHTML || src.result.translationHTML || "";
    const text = (tmp.textContent || "").trim().slice(0, 200);
    try { await clipboardCopy(text); new Notice("已复制释义"); } catch {}
}

async function addToDeck() {
    if (!word.value || adding.value) return;
    adding.value = true;
    await addToDeckFromSource(results.value[0]?.engine.id || "youdao");
    adding.value = false;
}

async function addToDeckFromSource(engineId: string) {
    const expr = word.value.trim().toLowerCase();
    if (plugin.wordStore.hasWord(expr)) { new Notice(`✓ ${expr} 已在词库中`); return; }
    const src = results.value.find(r => r.engine.id === engineId);
    let meaning = "";
    if (src?.result?.meaningHTML) {
        const tmp = document.createElement("div"); tmp.innerHTML = src.result.meaningHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 120);
    } else if (src?.result?.translationHTML) {
        const tmp = document.createElement("div"); tmp.innerHTML = src.result.translationHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 120);
    }
    const newWord: Word = {
        expression: expr, meaning: meaning || "待补充释义", phonetic: phonetic.value || "",
        pos: "", status: 1, t: "WORD", language: "en", tags: [engineId],
        notes: [], sentences: [], date: Math.floor(Date.now() / 1000), mastery: 1,
        mdLink: null, exposures: 0, lastExposure: null, exposureHistory: [],
        fsrs: createInitialCard(), ankiNoteId: null,
    };
    plugin.wordStore.addWord(newWord);
    new Notice(`✓ ${expr} 已加入词库`);
}

function close() { plugin.vueApp && (plugin as any)["closePopupSearch"]?.(); }

onMounted(() => { addEventListener("sl-search", onSearch as EventListener); });
onUnmounted(() => { removeEventListener("sl-search", onSearch as EventListener); });
</script>

<style scoped>
.sl-popup-search {
    position: fixed; z-index: 10000; width: 400px; max-height: 520px;
    background: var(--background-primary); border: 1px solid var(--interactive-accent);
    border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.28);
    overflow: hidden; display: flex; flex-direction: column; font-size: 0.88em;
}
.sl-popup-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px 8px;
    background: linear-gradient(135deg, var(--interactive-accent), var(--text-accent));
    color: white; flex-shrink: 0;
}
.sl-word-row { display: flex; align-items: baseline; gap: 8px; }
.sl-popup-word { font-size: 1.2em; font-weight: 700; letter-spacing: 0.02em; }
.sl-phonetic { font-size: 0.85em; opacity: 0.85; font-style: italic; }
.sl-head-actions { display: flex; gap: 4px; align-items: center; }
.sl-btn-icon {
    background: rgba(255,255,255,0.18); border: none; border-radius: 6px;
    width: 28px; height: 28px; cursor: pointer; font-size: 0.9em;
    display: flex; align-items: center; justify-content: center; transition: background 0.15s;
}
.sl-btn-icon:hover { background: rgba(255,255,255,0.32); }
.sl-btn-add {
    background: white; color: var(--interactive-accent); border: none; border-radius: 6px;
    padding: 4px 10px; font-size: 0.8em; font-weight: 700; cursor: pointer; transition: opacity 0.15s;
}
.sl-btn-add:disabled { opacity: 0.5; cursor: default; }
.sl-btn-close { background: none; border: none; cursor: pointer; color: white; font-size: 1em; opacity: 0.8; padding: 4px; }
.sl-btn-close:hover { opacity: 1; }
.sl-source-tabs {
    display: flex; gap: 4px; padding: 6px 10px;
    border-bottom: 1px solid var(--background-modifier-border); flex-wrap: wrap; flex-shrink: 0;
}
.sl-tab {
    background: var(--background-secondary); border: 1px solid var(--background-modifier-border);
    border-radius: 12px; padding: 2px 10px; font-size: 0.75em; cursor: pointer;
    color: var(--text-muted); transition: all 0.15s;
}
.sl-tab:hover { color: var(--text-normal); }
.sl-tab.active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
.sl-status { text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.9em; }
.sl-error { color: #e74c3c; }
.sl-spinner {
    display: inline-block; width: 12px; height: 12px;
    border: 2px solid var(--text-muted); border-top-color: var(--interactive-accent);
    border-radius: 50%; animation: sl-spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle;
}
@keyframes sl-spin { to { transform: rotate(360deg); } }
.sl-popup-body { flex: 1; overflow-y: auto; padding: 6px 0; }
.sl-source-card { border-bottom: 1px solid var(--background-modifier-border); }
.sl-source-card.collapsed .sl-card-body { display: none; }
.sl-card-header {
    display: flex; align-items: center; gap: 8px; padding: 7px 12px; cursor: pointer; transition: background 0.1s;
}
.sl-card-header:hover { background: var(--background-secondary); }
.sl-source-tag {
    font-size: 0.72em; font-weight: 700; padding: 1px 7px; border-radius: 4px; color: white;
}
.sl-src-youdao   { background: #4a90d9; }
.sl-src-cambridge { background: #c0392b; }
.sl-src-hjdict    { background: #27ae60; }
.sl-src-deepl     { background: #8e44ad; }
.sl-src-ai        { background: #e67e22; }
.sl-src-free      { background: #7f8c8d; }
.sl-card-status { font-size: 0.8em; }
.sl-card-status.ok  { color: #27ae60; }
.sl-card-status.err { color: #bbb; }
.sl-card-arrow { margin-left: auto; font-size: 0.7em; color: var(--text-muted); }
.sl-card-body { padding: 4px 12px 10px; }
.sl-prons { margin: 4px 0 6px; }
.sl-pron { margin-right: 10px; color: #9b59b6; cursor: pointer; font-size: 0.9em; }
.sl-pron:hover { text-decoration: underline; }
.sl-meaning { font-size: 0.88em; line-height: 1.6; margin-bottom: 6px; }
.sl-translation { font-size: 0.85em; color: var(--text-muted); font-style: italic; margin-bottom: 6px; padding-left: 8px; border-left: 2px solid var(--interactive-accent); }
.sl-collins { margin: 6px 0; }
.sl-collins-entry { margin-bottom: 6px; font-size: 0.85em; }
.sl-collins-entry strong { color: var(--text-normal); }
.sl-collins-content { margin-top: 2px; color: var(--text-muted); }
.sl-relword, .sl-suggestions { font-size: 0.85em; color: var(--text-muted); margin: 4px 0; }
.sl-card-actions { display: flex; gap: 6px; margin-top: 8px; }
.sl-btn-sm {
    padding: 3px 10px; font-size: 0.78em; background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border); border-radius: 5px;
    cursor: pointer; color: var(--text-normal);
}
.sl-btn-sm:hover { background: var(--background-modifier-hover); }
.sl-btn-accent { color: var(--interactive-accent); border-color: var(--interactive-accent); }
.sl-card-empty { padding: 6px 12px; font-size: 0.82em; color: var(--text-muted); font-style: italic; }
.sl-no-result { text-align: center; padding: 16px; color: var(--text-muted); font-size: 0.88em; }
.sl-popup-footer { padding: 6px 10px; border-top: 1px solid var(--background-modifier-border); text-align: center; flex-shrink: 0; }
.sl-footer-btn { background: none; border: none; cursor: pointer; font-size: 0.78em; color: var(--text-muted); text-decoration: underline; }
.sl-footer-btn:hover { color: var(--interactive-accent); }
</style>