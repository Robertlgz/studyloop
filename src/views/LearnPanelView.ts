import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App } from "vue";
import type StudyLoop from "@/main";
import { LEARN_PANEL_VIEW } from "@/constant";
import LearnPanel from "./LearnPanel.vue";

export class LearnPanelView extends ItemView {
    plugin: StudyLoop;
    vueapp: App;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return LEARN_PANEL_VIEW;
    }

    getDisplayText(): string {
        return "学习新单词";
    }

    getIcon(): string {
        return "reading-glasses";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(LearnPanel);
        this.vueapp.config.globalProperties.view = this;
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
    }

    async onClose() {
        this.vueapp.unmount();
    }
}