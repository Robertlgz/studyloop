import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App } from "vue";
import type StudyLoop from "@/main";
import SearchPanel from "./SearchPanel.vue";
import { SEARCH_PANEL_VIEW } from "@/constant";

export class SearchPanelView extends ItemView {
    plugin: StudyLoop;
    vueapp: App;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return SEARCH_PANEL_VIEW;
    }

    getDisplayText(): string {
        return "查词面板";
    }

    getIcon(): string {
        return "book";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(SearchPanel);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
    }

    async onClose() {
        this.vueapp.unmount();
    }
}