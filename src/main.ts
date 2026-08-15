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
import { READING_VIEW_TYPE } from "./constant";

export default class StudyLoop extends Plugin {
    declare settings: StudyLoopSettings;
    wordStore: WordStore;
    vueApp: VueApp;
    appEl: HTMLElement;
    store: typeof store = store;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingTab(this.app, this));

        // 初始化词库（从 worddb.json 加载）
        this.wordStore = new WordStore(this);
        await this.wordStore.load();

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
            callback: () => { this.activateView(SEARCH_PANEL_VIEW, "left"); }
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
                new Notice(`📚 今日 ${dueWords.length} 个词待复习`);
                // TODO: 打开复习视图
            }
        });

        // 创建 Vue 全局 app
        this.appEl = document.body.createDiv({ cls: "sl-app" });
        this.vueApp = createApp({});
        this.vueApp.config.globalProperties.plugin = this;
        this.vueApp.mount(this.appEl);
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(SEARCH_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(LEARN_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(DATA_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(STAT_VIEW_TYPE);
        this.wordStore.save();
        this.vueApp.unmount();
        this.appEl.remove();
        this.appEl = null;
    }

    registerViews() {
        this.registerView(SEARCH_PANEL_VIEW, (leaf) => new SearchPanelView(leaf, this));
        this.registerView(READING_VIEW_TYPE, (leaf) => new ReadingView(leaf, this));
        this.registerView(LEARN_PANEL_VIEW, (leaf) => new LearnPanelView(leaf, this));
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

    async loadSettings() {
        const data = (await this.loadData()) || {};
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}