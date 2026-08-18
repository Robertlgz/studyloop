// sl-data-panel：词库列表 / 当前文档词汇视图
import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import { createApp, App as VueApp } from "vue";
import type StudyLoop from "@/main";
import { DATA_PANEL_VIEW } from "@/constant";
import WordSidebar from "./WordSidebar.vue";

export class WordSidebarView extends ItemView {
    plugin: StudyLoop;
    vueapp: VueApp;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return DATA_PANEL_VIEW;
    }

    getDisplayText(): string {
        return "词库列表";
    }

    getIcon(): string {
        return "database";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("sl-data-panel-container");
        this.vueapp = createApp(WordSidebar);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
        // 监听当前文件切换，刷新词列表
        this.registerEvent(
            this.plugin.app.workspace.on("active-leaf-change", () => this.refresh()),
        );
    }

    async onClose() {
        this.vueapp.unmount();
    }

    async refresh() {
        // 让 Vue 组件内部 watch active file 并刷新
        const comp = (this.vueapp as any)._instance?.proxy;
        if (comp?.refresh) comp.refresh();
    }
}