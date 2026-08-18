// sl-review-queue：复习队列侧边栏视图
import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp, App as VueApp } from "vue";
import type StudyLoop from "@/main";
import { REVIEW_QUEUE_VIEW } from "@/constant";
import ReviewQueue from "./ReviewQueue.vue";

export class ReviewQueueView extends ItemView {
    plugin: StudyLoop;
    vueapp: VueApp;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return REVIEW_QUEUE_VIEW;
    }

    getDisplayText(): string {
        return "复习队列";
    }

    getIcon(): string {
        return "clock";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.vueapp = createApp(ReviewQueue);
        this.vueapp.config.globalProperties.plugin = this.plugin;
        this.vueapp.mount(container);
        this.registerEvent(
            this.plugin.app.workspace.on("active-leaf-change", () => this.refresh()),
        );
    }

    async onClose() {
        this.vueapp.unmount();
    }

    async refresh() {
        const comp = (this.vueapp as any)._instance?.proxy;
        if (comp?.refresh) comp.refresh();
    }
}