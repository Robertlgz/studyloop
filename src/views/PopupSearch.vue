<template>
    <div
        ref="popupRef"
        class="sl-popup-search"
        :style="popupStyle"
        @click.stop
        @mousedown.prevent
    >
        <!-- 拖拽标题栏 -->
        <div
            class="sl-popup-head"
            @mousedown="onDragStart"
            @mousemove="onDragMove"
            @mouseup="onDragEnd"
            @mouseleave="onDragEnd"
        >
            <div class="sl-word-row">
                <span class="sl-popup-word">{{ word }}</span>
                <span v-if="phonetic" class="sl-phonetic">{{ phonetic }}</span>
            </div>
            <div class="sl-head-actions">
                <button v-if="pronUrl" @click.stop="playAudio(pronUrl)" class="sl-btn-icon" title="播放发音">🔊</button>
                <button @click.stop="copyWord" class="sl-btn-icon" title="复制单词">📋</button>
                <button @click.stop="addToDeck" class="sl-btn-add" :disabled="adding">
                    {{ adding ? '✓ 已加入' : '+ 加入词库' }}
                </button>
                <button @click.stop="close" class="sl-btn-close" title="关闭">✕</button>
            </div>
        </div>

        <!-- 来源 tabs -->
        <div class="sl-source-tabs" v-if="results.length > 1">
            <button
                v-for="src in results"
                :key="src.engine.id"
                :class="['sl-tab', { active: activeSource === src.engine.id }]"
                @click.stop="activeSource = src.engine.id"
            >
                {{ src.engine.name }}
            </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading && results.length === 0" class="sl-status">
            <span class="sl-spinner"></span> 正在查询…
        </div>
        <div v-else-if="error && results.length === 0" class="sl-status sl-error">{{ error }}</div>

        <!-- 结果列表 -->
        <div class="sl-popup-body" v-else>
            <div
                v-for="src in filteredResults"
                :key="src.engine.id"
                class="sl-source-card"
                :class="{ collapsed: !src.expanded }"
            >
                <div class="sl-card-header" @click.stop="toggleSource(src.engine.id)">
                    <span class="sl-source-tag" :class="'sl-src-' + src.engine.id">{{ src.engine.name }}</span>
                    <span class="sl-card-status" :class="src.ok ? 'ok' : 'err'">
                        {{ src.ok ? '✓' : '—' }}
                    </span>
                    <span class="sl-card-meta" v-if="src.result.prons?.length">
                        🔊 {{ src.result.prons.length }}
                    </span>
                    <span class="sl-card-arrow">{{ src.expanded ? '▲' : '▼' }}</span>
                </div>
                <div v-if="src.ok && src.expanded" class="sl-card-body">
                    <div v-if="src.result.prons?.length" class="sl-prons">
                        <span v-for="(p, i) in src.result.prons" :key="i"
                            class="sl-pron" @click.stop="playAudio(p.url)">{{ p.phsym }}</span>
                    </div>
                    <div v-if="src.result.meaningHTML" class="sl-meaning" v-html="src.result.meaningHTML"></div>
                    <div v-if="src.result.translationHTML" class="sl-translation" v-html="src.result.translationHTML"></div>
                    <div v-if="src.result.collins?.length" class="sl-collins">
                        <div v-for="(c, i) in src.result.collins" :key="i" class="sl-collins-entry">
                            <strong>{{ c.title }}</strong>
                            <div class="sl-collins-content" v-html="c.content"></div>
                        </div>
                    </div>
                    <div v-if="src.result.discriminationHTML" class="sl-discrim" v-html="src.result.discriminationHTML"></div>
                    <div v-if="src.result.wordGroupHTML" class="sl-wordgroup" v-html="src.result.wordGroupHTML"></div>
                    <div v-if="src.result.relWordHTML" class="sl-relword" v-html="src.result.relWordHTML"></div>
                    <div v-if="src.result.suggestions" class="sl-suggestions" v-html="src.result.suggestions"></div>
                    <div class="sl-card-actions">
                        <button @click.stop="copyMeaning(src)" class="sl-btn-sm">📋 复制</button>
                        <button @click.stop="addToDeckFromSource(src.engine.id)" class="sl-btn-sm sl-btn-accent">+ 加词库</button>
                    </div>
                </div>
                <div v-else class="sl-card-empty">暂无结果</div>
            </div>
            <div v-if="results.length > 0 && !results.some(r => r.ok)" class="sl-no-result">
                ⚠️ 所有词典均未返回释义，请检查网络连接或切换翻译后端
            </div>
        </div>

        <!-- 底部 -->
        <div class="sl-popup-footer" v-if="results.length > 1">
            <span class="sl-footer-count">{{ okCount }}/{{ results.length }} 个源有结果</span>
            <button @click.stop="toggleAll" class="sl-footer-btn">
                {{ allExpanded ? '收起全部' : '展开全部' }}
            </button>
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

// ── 状态 ──────────────────────────────────────────────
const word = ref("");
const pos = ref({ x: 100, y: 100 });
const loading = ref(false);
const error = ref("");
const adding = ref(false);
const activeSource = ref<string>("all");
const popupRef = ref<HTMLElement | null>(null);

interface SourceItem extends SourceResult {
    expanded: boolean;
    ok: boolean;
}
const results = ref<SourceItem[]>([]);

// ── 查词历史 ───────────────────────────────────────────
interface HistoryEntry {
    word: string;
    time: number;
}
const history = ref<HistoryEntry[]>([]);
const showHistory = ref(false);

function loadHistory() {
    try {
        const raw = localStorage.getItem("sl-popup-history");
        if (raw) history.value = JSON.parse(raw);
    } catch {}
}
function saveHistory() {
    try { localStorage.setItem("sl-popup-history", JSON.stringify(history.value.slice(0, 30))); } catch {}
}
function addToHistory(w: string) {
    const entry: HistoryEntry = { word: w, time: Date.now() };
    history.value = [entry, ...history.value.filter(h => h.word !== w)].slice(0, 30);
    saveHistory();
}
function clearHistory() {
    history.value = [];
    saveHistory();
}
loadHistory();

// ── 计算属性 ───────────────────────────────────────────
const filteredResults = computed(() => {
    if (activeSource.value === "all") return results.value;
    return results.value.filter(r => r.engine.id === activeSource.value);
});
const phonetic = computed(() => {
    const r = results.value.find(s => s.result.prons?.length);
    return r?.result.prons?.[0]?.phsym || "";
});
const pronUrl = computed(() => {
    const r = results.value.find(s => s.result.prons?.length);
    return r?.result.prons?.[0]?.url || "";
});
const allExpanded = computed(() => results.value.every(r => r.expanded));
const okCount = computed(() => results.value.filter(r => r.ok).length);

const popupStyle = computed(() => ({
    left: pos.value.x + "px",
    top: pos.value.y + "px",
}));

// ── 拖拽 ───────────────────────────────────────────────
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function onDragStart(e: MouseEvent) {
    if ((e.target as HTMLElement).closest(".sl-head-actions")) return;
    isDragging = true;
    dragOffset.x = e.clientX - pos.value.x;
    dragOffset.y = e.clientY - pos.value.y;
    document.body.style.cursor = "grabbing";
}
function onDragMove(e: MouseEvent) {
    if (!isDragging) return;
    pos.value = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
}
function onDragEnd() {
    isDragging = false;
    document.body.style.cursor = "";
}

// ── 点击外部关闭 ───────────────────────────────────────
function handleClickOutside(e: MouseEvent) {
    if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
        close();
    }
}

// ── 查询（支持短语） ───────────────────────────────────
async function onSearch(evt: CustomEvent) {
    const detail = evt.detail as { selection: string; position?: { x: number; y: number } };
    // 短语支持：截断到合理长度，保留空格
    const rawWord = (detail.selection || "").trim();
    if (!rawWord) return;
    // 截断过长的选择（>100字符只查前100）
    const query = rawWord.length > 100 ? rawWord.slice(0, 100) : rawWord;
    word.value = query;
    addToHistory(query);

    // 首次定位在选区附近，之后靠拖拽固定
    if (results.value.length === 0) {
        const px = detail.position?.x || window.innerWidth - 420;
        const py = detail.position?.y || 80;
        pos.value = { x: px, y: py };
    }
    results.value = [];
    loading.value = true;
    error.value = "";
    activeSource.value = "all";

    try {
        const enabled = Object.keys(plugin.settings.dictionaries).filter(
            id => plugin.settings.dictionaries[id].enable,
        );
        const raw = await searchAllParallel(query, enabled, {
            aiApiKey: plugin.settings.ai_api_key,
            aiProvider: plugin.settings.ai_provider,
            aiModel: plugin.settings.ai_model,
        });
        const priority = ["youdao", "cambridge", "hjdict", "deepl", "ai", "free"];
        raw.sort((a, b) => priority.indexOf(a.engine.id) - priority.indexOf(b.engine.id));
        results.value = raw.map(r => ({
            ...r,
            // 智能首源优先：第一个有结果的默认展开，其余折叠
            expanded: r.ok && results.value.filter((_, i) => i < raw.indexOf(r)).some((_, j) => false),
            ok: !!(r.result.meaningHTML || r.result.translationHTML),
        }));
        // 智能展开：第一个有结果的默认展开，其余折叠
        const firstOkIdx = results.value.findIndex(r => r.ok);
        results.value.forEach((r, i) => {
            r.expanded = i === firstOkIdx;
        });

        if (results.value.length === 0) {
            error.value = `未找到 "${query}" 的释义。已启用：${enabled.join(", ")}`;
        }
    } catch (e) {
        error.value = "查询失败：" + ((e as Error).message || e);
    } finally {
        loading.value = false;
    }
}

// ── 交互 ───────────────────────────────────────────────
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
    try { await clipboardCopy(word.value); new Notice("✓ 已复制单词"); } catch {}
}
async function copyMeaning(src: SourceItem) {
    const tmp = document.createElement("div");
    tmp.innerHTML = src.result.meaningHTML || src.result.translationHTML || "";
    const text = (tmp.textContent || "").trim().slice(0, 200);
    try { await clipboardCopy(text); new Notice("✓ 已复制释义"); } catch {}
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
        meaning = (tmp.textContent || "").trim().slice(0, 150);
    } else if (src?.result?.translationHTML) {
        const tmp = document.createElement("div"); tmp.innerHTML = src.result.translationHTML;
        meaning = (tmp.textContent || "").trim().slice(0, 150);
    }
    const newWord: Word = {
        expression: expr, meaning: meaning || "待补充释义", phonetic: phonetic.value || "",
        pos: "", status: 1, t: "WORD", language: "en", tags: [engineId],
        notes: [], sentences: [], date: Math.floor(Date.now() / 1000), mastery: 1,
        mdLink: null, exposures: 0, lastExposure: null, exposureHistory: [],
        fsrs: createInitialCard(), ankiNoteId: null, ankiHash: undefined,
    };
    plugin.wordStore.addWord(newWord);
    new Notice(`✓ ${expr} 已加入词库`);
}
function close() { plugin.vueApp && (plugin as any)["closePopupSearch"]?.(); }

onMounted(() => {
    addEventListener("sl-search", onSearch as EventListener);
    document.addEventListener("mousedown", handleClickOutside);
});
onUnmounted(() => {
    removeEventListener("sl-search", onSearch as EventListener);
    document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
.sl-popup-search {
    position: fixed; z-index: 10000; width: 400px; max-height: 540px;
    background: var(--background-primary); border: 1px solid var(--interactive-accent);
    border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    overflow: hidden; display: flex; flex-direction: column; font-size: 0.87em;
    user-select: none;
}
.sl-popup-head { cursor: grab; }
.sl-popup-head:active { cursor: grabbing; }

/* 顶部 */
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
    display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0;
}
.sl-btn-icon:hover { background: rgba(255,255,255,0.32); }
.sl-btn-add {
    background: white; color: var(--interactive-accent); border: none; border-radius: 6px;
    padding: 4px 10px; font-size: 0.78em; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s; white-space: nowrap;
}
.sl-btn-add:disabled { opacity: 0.5; cursor: default; }
.sl-btn-close { background: none; border: none; cursor: pointer; color: white; font-size: 1em; opacity: 0.8; padding: 4px; }
.sl-btn-close:hover { opacity: 1; }

/* tabs */
.sl-source-tabs {
    display: flex; gap: 4px; padding: 6px 10px;
    border-bottom: 1px solid var(--background-modifier-border); flex-wrap: wrap; flex-shrink: 0;
}
.sl-tab {
    background: var(--background-secondary); border: 1px solid var(--background-modifier-border);
    border-radius: 12px; padding: 2px 10px; font-size: 0.74em; cursor: pointer;
    color: var(--text-muted); transition: all 0.15s; white-space: nowrap;
}
.sl-tab:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
.sl-tab.active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }

/* 状态 */
.sl-status { text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.9em; }
.sl-error { color: var(--text-error); font-size: 0.85em; padding: 16px; }
.sl-spinner {
    display: inline-block; width: 12px; height: 12px;
    border: 2px solid var(--text-muted); border-top-color: var(--interactive-accent);
    border-radius: 50%; animation: sl-spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle;
}
@keyframes sl-spin { to { transform: rotate(360deg); } }

/* 主体 */
.sl-popup-body { flex: 1; overflow-y: auto; padding: 4px 0; }

/* 卡片 */
.sl-source-card { border-bottom: 1px solid var(--background-modifier-border); }
.sl-source-card.collapsed .sl-card-body { display: none; }
.sl-card-header {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 12px; cursor: pointer; transition: background 0.1s;
}
.sl-card-header:hover { background: var(--background-secondary); }
.sl-source-tag {
    font-size: 0.72em; font-weight: 700; padding: 1px 7px;
    border-radius: 4px; color: white; flex-shrink: 0;
}
.sl-src-youdao   { background: #4a90d9; }
.sl-src-cambridge { background: #c0392b; }
.sl-src-hjdict    { background: #27ae60; }
.sl-src-deepl     { background: #8e44ad; }
.sl-src-ai        { background: var(--color-orange); }
.sl-src-free      { background: #7f8c8d; }
.sl-card-status { font-size: 0.85em; flex-shrink: 0; }
.sl-card-status.ok  { color: #27ae60; }
.sl-card-status.err { color: var(--text-faint); }
.sl-card-meta { font-size: 0.75em; color: var(--text-muted); margin-left: auto; }
.sl-card-arrow { font-size: 0.68em; color: var(--text-muted); margin-left: auto; }

/* 卡片内容 */
.sl-card-body { padding: 4px 12px 10px; }
.sl-prons { margin: 2px 0 6px; }
.sl-pron { margin-right: 8px; color: var(--text-accent); cursor: pointer; font-size: 0.88em; }
.sl-pron:hover { text-decoration: underline; }
.sl-meaning { font-size: 0.87em; line-height: 1.6; margin-bottom: 6px; }
.sl-translation {
    font-size: 0.84em; color: var(--text-muted); font-style: italic;
    margin-bottom: 6px; padding-left: 8px; border-left: 2px solid var(--interactive-accent);
}
.sl-collins { margin: 4px 0; }
.sl-collins-entry { margin-bottom: 5px; font-size: 0.84em; }
.sl-collins-entry strong { color: var(--text-normal); }
.sl-collins-content { margin-top: 2px; color: var(--text-muted); font-size: 0.95em; }
.sl-discrim, .sl-wordgroup, .sl-relword, .sl-suggestions {
    font-size: 0.84em; color: var(--text-muted); margin: 4px 0;
}
.sl-card-actions { display: flex; gap: 6px; margin-top: 8px; }
.sl-btn-sm {
    padding: 3px 10px; font-size: 0.77em; background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border); border-radius: 5px;
    cursor: pointer; color: var(--text-normal); transition: background 0.1s;
}
.sl-btn-sm:hover { background: var(--background-modifier-hover); }
.sl-btn-accent { color: var(--interactive-accent); border-color: var(--interactive-accent); }
.sl-card-empty { padding: 6px 12px; font-size: 0.82em; color: var(--text-muted); font-style: italic; }
.sl-no-result {
    text-align: center; padding: 16px; font-size: 0.85em;
    color: var(--color-orange); background: rgba(230,126,34,0.06);
}

/* 底部 */
.sl-popup-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px; border-top: 1px solid var(--background-modifier-border);
    flex-shrink: 0; font-size: 0.78em;
}
.sl-footer-count { color: var(--text-muted); }
.sl-footer-btn {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); text-decoration: underline;
}
.sl-footer-btn:hover { color: var(--interactive-accent); }
</style>