// sl-today：今日学习引导视图
import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App as VueApp } from "vue";
import type StudyLoop from "@/main";
import { TODAY_VIEW } from "@/constant";
import TodaySession from "./TodaySession.vue";

export class TodaySessionView extends ItemView {
    plugin: StudyLoop;
    vueapp: VueApp;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return TODAY_VIEW;
    }

    getDisplayText(): string {
        return "今日学习";
    }

    getIcon(): string {
        return "star";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(TodaySession);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
    }

    async onClose() {
        this.vueapp.unmount();
    }
}