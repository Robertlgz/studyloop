// sl-history：查词历史侧边栏
import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App as VueApp } from "vue";
import type StudyLoop from "@/main";
import { HISTORY_VIEW } from "@/constant";
import HistoryPanel from "./HistoryView.vue";

export class HistoryView extends ItemView {
    plugin: StudyLoop;
    vueapp: VueApp;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return HISTORY_VIEW; }
    getDisplayText(): string { return "查词历史"; }
    getIcon(): string { return "history"; }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(HistoryPanel);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
    }

    async onClose() { this.vueapp.unmount(); }
}