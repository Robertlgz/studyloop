import { Notice, Plugin, Menu, Platform, WorkspaceLeaf, TFile } from "obsidian";
import { createApp } from "vue";
import type { App as VueApp } from "vue";

import { DEFAULT_SETTINGS } from "./settings";
import type { StudyLoopSettings } from "./settings";
import { SettingTab } from "./settings";
import { WordStore } from "./db/word-store";
import store from "./store";
import { SEARCH_ICON, SEARCH_PANEL_VIEW, LEARN_PANEL_VIEW, STAT_VIEW_TYPE, DATA_PANEL_VIEW, READING_VIEW_TYPE, REVIEW_QUEUE_VIEW, TODAY_VIEW, HISTORY_VIEW } from "./constant";
import { SearchPanelView } from "./views/SearchPanelView";
import { ReadingView } from "./views/ReadingView";
import { LearnPanelView } from "./views/LearnPanelView";
import { StatView } from "./views/StatView";
import { WordSidebarView } from "./views/WordSidebarView";
import { ReviewQueueView } from "./views/ReviewQueueView";
import { TodaySessionView } from "./views/TodaySessionView";
import { HistoryView } from "./views/HistoryView";
import PopupSearch from "./views/PopupSearch.vue";
import { ReviewModalWrapper } from "./views/ReviewModalWrapper";
import { AnkiAutoSync } from "./anki/auto-sync";
import { syncReviewDatabase, syncWordDatabase, triggerVariousComplementsReload } from "./db/sync";
import { importFromLL } from "./db/importers/ll-indexeddb";
import { importFromCSV } from "./db/importers/csv";
import { importFromKindle } from "./db/importers/kindle";
import { TextImportModal } from "./views/TextImportModal";
import { generateReviewStory } from "./ai/story-generator";
import { escapeHtml } from "./utils/translation";

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

        // 同步 settings → store（让字体/行距等设置立即生效）
        this.syncSettingsToStore();

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
                    .onClick(() => this.activateView(DATA_PANEL_VIEW, "right"));
            });
            menu.addItem((item) => {
                item.setTitle("复习队列")
                    .setIcon("clock")
                    .onClick(() => this.activateView(REVIEW_QUEUE_VIEW, "right"));
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle("今日学习")
                    .setIcon("star")
                    .onClick(() => this.activateView(TODAY_VIEW, "right"));
            });
            menu.addItem((item) => {
                item.setTitle("在阅读视图打开")
                    .setIcon("reading-glasses")
                    .onClick(() => this.openReadingView());
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle("导入词库 (Language Learner)")
                    .setIcon("database")
                    .onClick(() => this.importFromLL());
            });
            menu.addItem((item) => {
                item.setTitle("导入 CSV")
                    .setIcon("file-spreadsheet")
                    .onClick(() => this.openImportModal("CSV 导入", "粘贴 CSV 文本（word,meaning 每行一个）", importFromCSV));
            });
            menu.addItem((item) => {
                item.setTitle("导入 Kindle")
                    .setIcon("kindle")
                    .onClick(() => this.openImportModal("Kindle 导入", "粘贴 Kindle 生词本文本（TSV/纯单词）", importFromKindle));
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle("生成 AI 复习故事")
                    .setIcon("sparkles")
                    .onClick(() => this.generateStory());
            });
            menu.addSeparator();
            menu.addItem((item) => {
                item.setTitle("查词历史")
                    .setIcon("history")
                    .onClick(() => this.activateView(HISTORY_VIEW, "right"));
            });
            menu.showAtMouseEvent(evt);
        });

        // ========== 命令注册 ==========
        this.addCommand({
            id: "start-today-session",
            name: "开始今日学习",
            callback: () => this.activateView(TODAY_VIEW, "right"),
        });
        this.addCommand({
            id: "open-today-session",
            name: "打开今日学习面板",
            callback: () => this.activateView(TODAY_VIEW, "right"),
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
            id: "open-reading-view",
            name: "在阅读视图中打开当前文件",
            callback: () => this.openReadingView(),
        });
        this.addCommand({
            id: "open-review-queue",
            name: "打开复习队列侧边栏",
            callback: () => this.activateView(REVIEW_QUEUE_VIEW, "right"),
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
        this.addCommand({
            id: "import-from-ll",
            name: "从 Language Learner 导入词库",
            callback: () => this.importFromLL(),
        });
        this.addCommand({
            id: "import-csv",
            name: "导入 CSV 词库",
            callback: () => this.openImportModal("CSV 导入", "粘贴 CSV 文本（word,meaning 每行一个）", importFromCSV),
        });
        this.addCommand({
            id: "import-kindle",
            name: "导入 Kindle 生词本",
            callback: () => this.openImportModal("Kindle 导入", "粘贴 Kindle 生词本文本（TSV/纯单词）", importFromKindle),
        });
        this.addCommand({
            id: "generate-review-story",
            name: "生成 AI 复习故事",
            callback: () => this.generateStory(),
        });
        this.addCommand({
            id: "open-history",
            name: "打开查词历史",
            callback: () => this.activateView(HISTORY_VIEW, "right"),
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

        // 文件右键菜单 → 在阅读视图打开
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile && file.extension === "md") {
                    menu.addItem((item) => {
                        item.setTitle("在 StudyLoop 阅读视图中打开")
                            .setIcon("highlight-glyph")
                            .onClick(() => this.openReadingView(file));
                    });
                }
            }),
        );
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(SEARCH_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(LEARN_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(DATA_PANEL_VIEW);
        this.app.workspace.detachLeavesOfType(STAT_VIEW_TYPE);
        this.app.workspace.detachLeavesOfType(REVIEW_QUEUE_VIEW);
        this.app.workspace.detachLeavesOfType(TODAY_VIEW);
        this.app.workspace.detachLeavesOfType(HISTORY_VIEW);
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
        this.registerView(DATA_PANEL_VIEW, (leaf) => new WordSidebarView(leaf, this));
        this.registerView(REVIEW_QUEUE_VIEW, (leaf) => new ReviewQueueView(leaf, this));
        this.registerView(TODAY_VIEW, (leaf) => new TodaySessionView(leaf, this));
        this.registerView(HISTORY_VIEW, (leaf) => new HistoryView(leaf, this));
    }

    /** 将 settings 同步到 store，使字体/样式设置立即生效 */
    syncSettingsToStore() {
        store.fontSize = this.settings.font_size || "";
        store.fontFamily = this.settings.font_family || "";
        store.lineHeight = this.settings.line_height || "";
        store.popupSearch = this.settings.popup_search !== false;
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

    /** 在阅读视图中打开指定文件（或当前激活文件） */
    async openReadingView(file?: any) {
        const targetFile = file || this.app.workspace.getActiveFile();
        if (!targetFile) {
            new Notice("请先打开一个文件");
            return;
        }
        const leaf = this.app.workspace.getLeaf("tab");
        await leaf.setViewState({ type: READING_VIEW_TYPE, state: { file: targetFile.path }, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    // ============ 导入功能 ============

    async importFromLL() {
        try {
            new Notice("正在从 Language Learner IndexedDB 导入...");
            const count = await importFromLL(this);
            new Notice(`✅ 已导入 ${count} 个词`);
        } catch (e) {
            new Notice("❌ 导入失败：" + ((e as Error).message || e));
        }
    }

    openImportModal(title: string, placeholder: string, onImport: (text: string) => Promise<number>) {
        new TextImportModal(this.app, title, placeholder, onImport).open();
    }

    /** 生成 AI 复习故事并保存为笔记 */
    async generateStory() {
        if (!this.settings.ai_api_key) {
            new Notice("请先在设置中配置 AI API Key");
            return;
        }
        const words = this.wordStore.getAllWords().filter(w => w.status > 0 && w.sentences.length > 0);
        if (words.length === 0) {
            new Notice("词库中没有含例句的词，无法生成故事");
            return;
        }
        // 取最近学的 5-8 个词
        const recent = words.slice(-Math.min(8, words.length)).map(w => w.expression);
        new Notice(`正在生成复习故事（使用 ${recent.length} 个词）...`);
        try {
            const story = await generateReviewStory(this, recent, Math.min(5, recent.length));
            const filename = `复习故事-${new Date().toISOString().slice(0, 10)}.md`;
            const folder = "复习故事";
            const fullPath = `${folder}/${filename}`;
            // 确保文件夹存在
            const folderFiles = this.app.vault.getAbstractFileByPath(folder);
            if (!folderFiles) {
                await this.app.vault.createFolder(folder);
            }
            const content = `# ${story.title}

> AI 复习故事 · ${new Date().toLocaleString()}
> 使用词汇：${story.words.join(", ")}

${story.content}

---

## Quiz

${story.quiz.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`;
            await this.app.vault.create(fullPath, content);
            const file = this.app.vault.getFileByPath(fullPath);
            if (file) {
                const leaf = this.app.workspace.getLeaf("tab");
                await leaf.setViewState({ type: "markdown", state: { file: file.path }, active: true });
            }
            new Notice(`✅ 复习故事已生成并打开：${filename}`);
        } catch (e) {
            new Notice("❌ 故事生成失败：" + ((e as Error).message || e));
        }
    }

    // ============ 查词 / 弹窗 ============

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
        // 关闭旧的弹窗
        this.closePopupSearch?.();
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
                position: position || { x: Math.min(window.innerWidth - 400, 600), y: 80 },
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