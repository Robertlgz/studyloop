import { Notice, Plugin, Menu, Platform, WorkspaceLeaf } from "obsidian";
import { createApp } from "vue";
import type { App as VueApp } from "vue";

import { DEFAULT_SETTINGS } from "./settings";
import type { StudyLoopSettings } from "./settings";
import { SettingTab } from "./settings";
import { WordStore } from "./db/word-store";
import store from "./store";
import { SEARCH_ICON, SEARCH_PANEL_VIEW, LEARN_PANEL_VIEW, STAT_VIEW_TYPE, DATA_PANEL_VIEW } from "./constant";
import { SearchPanelView } from "./views/SearchPanelView";
import { ReadingView } from "./views/ReadingView";
import { LearnPanelView } from "./views/LearnPanelView";
import { StatView } from "./views/StatView";
import { READING_VIEW_TYPE } from "./constant";
import { AnkiAutoSync } from "./anki/auto-sync";
import { syncReviewDatabase, syncWordDatabase, triggerVariousComplementsReload } from "./db/sync";

export default class StudyLoop extends Plugin {
    declare settings: StudyLoopSettings;
    wordStore: WordStore;
    vueApp: VueApp;
    appEl: HTMLElement;
    store: typeof store = store;
    ankiSync: AnkiAutoSync;
    popupSearchApp: any = null;
    popupSearchEl: HTMLElement | null = null;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingTab(this.app, this));

        // 初始化词库（从 worddb.json 加载）
        this.wordStore = new WordStore(this);
        await this.wordStore.load();
        // 词库变更时自动同步数据库（防抖 2 秒）
        this.wordStore.onChange = () => this.scheduleSync();

        // 注册视图
        this.registerViews();

        // ribbon 图标（单图标 + Menu）
        this.addRibbonIcon(SEARCH_ICON, "StudyLoop", (evt) => {
            const menu = new Menu();
            menu.addItem((item) => {
                item.setTitle("查词面板")
                    .setIcon(SEARCH_ICON)
                    .onClick(() => this.activateView(SEARCH_PANEL_VIEW, "left"));
            });
            menu.addItem((item) => {
                item.setTitle("生词管理")
                    .setIcon("reading-glasses")
                    .onClick(() => this.activateView(LEARN_PANEL_VIEW, "right"));
            });
            menu.addItem((item) => {
                item.setTitle("统计")
                    .setIcon("bar-chart-4")
                    .onClick(() => this.activateView(STAT_VIEW_TYPE, "right"));
            });
            menu.addItem((item) => {
                item.setTitle("词库列表")
                    .setIcon("database")
                    .onClick(() => this.activateView(DATA_PANEL_VIEW, "tab"));
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle("今日学习")
                    .setIcon("star")
                    .onClick(() => { new Notice("今日学习 (待实现)"); });
            });
            menu.showAtMouseEvent(evt);
        });

        // 注册命令
        this.addCommand({
            id: "start-today-session",
            name: "开始今日学习",
            callback: () => { new Notice("今日学习 (待实现)"); }
        });
        this.addCommand({
            id: "search-word",
            name: "查词",
            callback: () => {
                const selection = window.getSelection()?.toString().trim();
                if (selection && selection.length <= 200) {
                    this.queryWord(selection);
                } else {
                    this.activateView(SEARCH_PANEL_VIEW, "left");
                }
            }
        });
        this.addCommand({
            id: "search-word-select",
            name: "划词翻译（选中文字）",
            callback: () => {
                const selection = window.getSelection()?.toString().trim();
                if (selection && selection.length <= 200) {
                    this.queryWord(selection);
                } else {
                    new Notice("请先用鼠标选中要翻译的文字");
                }
            }
        });
        this.addCommand({
            id: "review-due-cards",
            name: "复习待复习词",
            callback: () => {
                const dueWords = this.wordStore.getDueWords();
                if (dueWords.length === 0) {
                    new Notice("🎉 没有待复习的词");
                    return;
                }
                this.openReviewModal();
            }
        });
        this.addCommand({
            id: "studyloop-anki-sync",
            name: "立即同步 Anki",
            callback: async () => {
                new Notice("正在同步到 Anki...");
                const count = await this.ankiSync.syncNow();
                if (count < 0) {
                    new Notice("❌ Anki 未运行或 AnkiConnect 不可用");
                } else {
                    new Notice(`✅ 已同步 ${count} 个词到 Anki`);
                }
            }
        });
        this.addCommand({
            id: "studyloop-sync-databases",
            name: "同步复习数据库（写复习数据.txt / 词汇统计.txt）",
            callback: async () => {
                new Notice("正在同步数据库...");
                const reviewCount = await syncReviewDatabase(this);
                const wordCount = await syncWordDatabase(this);
                await triggerVariousComplementsReload(this);
                new Notice(`✅ 已同步 ${reviewCount} 个复习块 + ${wordCount} 个词汇统计`);
            }
        });

        // 创建 Vue 全局 app
        this.appEl = document.body.createDiv({ cls: "sl-app" });
        this.vueApp = createApp({});
        this.vueApp.config.globalProperties.plugin = this;
        this.vueApp.mount(this.appEl);

        // 启动 Anki 自动同步
        this.ankiSync = new AnkiAutoSync(this);
        this.ankiSync.start();

        // 划词翻译（选中文字 + 功能键 → 查词）
        this.registerMouseup();

        // 复习点击发音（SR 容器内点单词发音，A4 修复）
        this.registerLeftClick();
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(SEARCH_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(LEARN_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(DATA_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(STAT_VIEW_TYPE);
        this.wordStore.save();
        this.ankiSync?.stop();
        this.closePopupSearch();
        this.vueApp.unmount();
        this.appEl.remove();
        this.appEl = null;
    }

    registerViews() {
        this.registerView(SEARCH_PANEL_VIEW, (leaf) => new SearchPanelView(leaf, this));
        this.registerView(READING_VIEW_TYPE, (leaf) => new ReadingView(leaf, this));
        this.registerView(LEARN_PANEL_VIEW, (leaf) => new LearnPanelView(leaf, this));
        this.registerView(STAT_VIEW_TYPE, (leaf) => new StatView(leaf, this));
    }

    async setMarkdownView(leaf: WorkspaceLeaf, focus = true) {
        await leaf.setViewState(
            {
                type: "markdown",
                state: leaf.view.getState(),
            } as any,
            { focus },
        );
    }

    async activateView(viewType: string, side: "left" | "right" | "tab") {
        if (this.app.workspace.getLeavesOfType(viewType).length === 0) {
            let leaf;
            switch (side) {
                case "left": leaf = this.app.workspace.getLeftLeaf(false); break;
                case "right": leaf = this.app.workspace.getRightLeaf(false); break;
                case "tab": leaf = this.app.workspace.getLeaf("tab"); break;
            }
            if (leaf) {
                await leaf.setViewState({ type: viewType, active: true });
            }
        }
        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(viewType)[0]
        );
    }

    // ============ 划词翻译 ============

    /** 查词（触发划词翻译的核心方法） */
    async queryWord(word: string, position?: { x: number; y: number }) {
        if (!word || !word.trim()) return;

        // 弹窗模式：如果启用 popup_search，使用浮动弹窗
        if (this.settings.popup_search) {
            this.openPopupSearch(word.trim(), position);
            if (this.settings.auto_pron) this.playWordAudio(word.trim());
            return;
        }

        // 侧边栏模式
        await this.activateView(SEARCH_PANEL_VIEW, "left");
        dispatchEvent(new CustomEvent("sl-search", {
            detail: { selection: word.trim() },
        }));

        if (this.settings.auto_pron) {
            this.playWordAudio(word.trim());
        }
    }

    /** 打开浮动弹窗查词 */
    openPopupSearch(word: string, position?: { x: number; y: number }) {
        const { createApp } = require("vue");
        // 关闭旧的弹窗
        this.closePopupSearch?.();
        const { PopupSearch } = require("./views/PopupSearch.vue");
        const el = document.body.createDiv({ cls: "sl-popup-root" });
        const app = createApp(PopupSearch);
        app.config.globalProperties.plugin = this;
        app.mount(el);
        this.popupSearchApp = app;
        this.popupSearchEl = el;
        // 派发查词事件
        dispatchEvent(new CustomEvent("sl-search", {
            detail: {
                selection: word,
                position: position || { x: window.innerWidth - 400, y: 80 },
            },
        }));
    }

    /** 关闭浮动弹窗 */
    closePopupSearch() {
        if (this.popupSearchApp) {
            this.popupSearchApp.unmount();
            this.popupSearchApp = null;
        }
        if (this.popupSearchEl) {
            this.popupSearchEl.remove();
            this.popupSearchEl = null;
        }
    }

    /** 播放单词发音 */
    playWordAudio(word: string) {
        try {
            const accent = this.settings.review_prons;
            const url = `http://dict.youdao.com/dictvoice?type=${accent}&audio=${encodeURIComponent(word)}`;
            new Audio(url).play();
        } catch {
            // ignore audio errors
        }
    }

    /** 监听鼠标抬起 → 检查选区 + 功能键 → 划词翻译 */
    registerMouseup() {
        this.registerDomEvent(document.body, "pointerup", (evt) => {
            try {
                const target = evt.target as HTMLElement;
                // 跳过插件自身 UI
                if (target?.matchParent?.(".sl-app, #sl-search, #sl-learn-panel, #sl-reading")) return;

                // 检查功能键
                const funcKey = this.settings.function_key;
                if (funcKey === "disable") return;
                if ((evt as any)[funcKey] !== true) return;

                // 获取选区
                const selection = window.getSelection()?.toString().trim();
                if (!selection || selection.length > 200) return;

                // 划词翻译
                evt.stopImmediatePropagation();
                this.queryWord(selection, { x: evt.clientX + 10, y: evt.clientY + 10 });
            } catch {
                // ignore
            }
        });
    }

    /** 打开复习模态框 */
    openReviewModal() {
        const { ReviewModalWrapper } = require("./views/ReviewModalWrapper");
        const modal = new ReviewModalWrapper(this.app, this);
        modal.open();
    }

    /** 监听左键点击 → 复习容器内点单词发音（A4 修复） */
    registerLeftClick() {
        this.registerDomEvent(document.body, "click", (evt) => {
            try {
                const target = evt.target as HTMLElement;
                // 复习卡片容器（兼容多种 SR 插件 DOM 结构）
                const inReviewContext =
                    target.matchParent(".sr-modal-content") ||
                    target.matchParent(".sr-flashcard") ||
                    target.matchParent(".sr-card") ||
                    target.matchParent(".modal-container") ||
                    target.matchParent("[class*='sr-']");
                if (!inReviewContext) return;

                const isWordElement =
                    target.tagName === "H4" ||
                    target.hasClass("speaker") ||
                    target.tagName === "AUDIO";
                if (!isWordElement) return;

                const word = (target.textContent || "").trim();
                if (!word || word.length > 50) return;
                this.playWordAudio(word);
            } catch {
                // ignore
            }
        });
    }

    /** 触发数据库同步（防抖） */
    private syncTimer: number | null = null;
    scheduleSync() {
        if (this.syncTimer !== null) clearTimeout(this.syncTimer);
        this.syncTimer = window.setTimeout(async () => {
            if (this.settings.auto_refresh_db) {
                try {
                    await syncReviewDatabase(this);
                    await syncWordDatabase(this);
                    await triggerVariousComplementsReload(this);
                } catch {
                    // ignore
                }
            }
        }, 2000);
    }

    async loadSettings() {
        const data = (await this.loadData()) || {};
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}