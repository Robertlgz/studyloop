// 复习模态框（Obsidian Modal + Vue 组件包装）
// P4 修复：真正挂载 ReviewModal，之前只弹 Notice

import { App, Modal } from "obsidian";
import { createApp } from "vue";
import type StudyLoop from "@/main";
import ReviewModal from "./ReviewModal.vue";

export class ReviewModalWrapper extends Modal {
    plugin: StudyLoop;
    private vueApp: any;

    constructor(app: App, plugin: StudyLoop) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("sl-review-modal-container");

        // 挂载 Vue 复习组件
        this.vueApp = createApp(ReviewModal);
        this.vueApp.config.globalProperties.plugin = this.plugin;
        this.vueApp.mount(contentEl);

        // 加载复习队列
        const reviewComp = (this.vueApp as any)._instance?.proxy;
        if (reviewComp?.loadReviewQueue) {
            reviewComp.loadReviewQueue();
        }
    }

    onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
    }
}