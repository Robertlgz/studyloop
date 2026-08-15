import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App } from "vue";
import type StudyLoop from "@/main";
import { STAT_VIEW_TYPE } from "@/constant";
import Stat from "./StatView.vue";

export class StatView extends ItemView {
    plugin: StudyLoop;
    vueapp: App;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return STAT_VIEW_TYPE; }
    getDisplayText() { return "统计"; }
    getIcon() { return "bar-chart-4"; }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(Stat);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
    }

    async onClose() { this.vueapp.unmount(); }
}