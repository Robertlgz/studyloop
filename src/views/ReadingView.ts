import { Menu, TextFileView, WorkspaceLeaf } from "obsidian";
import { createApp, App as VueApp } from "vue";
import type StudyLoop from "@/main";
import { READING_VIEW_TYPE } from "@/constant";
import ReadingArea from "./ReadingArea.vue";

export class ReadingView extends TextFileView {
    plugin: StudyLoop;
    text: string;
    vueapp: VueApp;
    firstInit = true;

    constructor(leaf: WorkspaceLeaf, plugin: StudyLoop) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return READING_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.file?.name || "阅读视图";
    }

    getIcon(): string {
        return "highlight-glyph";
    }

    getViewData(): string {
        return this.data;
    }

    async setViewData(data: string, _clear?: boolean) {
        this.text = data;
        if (this.firstInit) {
            this.vueapp = createApp(ReadingArea);
            this.vueapp.config.globalProperties.plugin = this.plugin;
            this.vueapp.config.globalProperties.view = this;
            this.vueapp.mount(this.contentEl);
            this.firstInit = false;
        }
    }

    clear(): void {}

    onPaneMenu(menu: Menu): void {
        menu.addItem((item) => {
            item.setTitle("返回 Markdown")
                .setIcon("document")
                .onClick(() => this.backToMarkdown());
        });
        super.onPaneMenu(menu, "");
    }

    backToMarkdown(): void {
        this.plugin.setMarkdownView(this.leaf);
    }

    divide(lines: string[]): Record<string, { start: number; end: number }> {
        const positions: [string, number][] = [
            ["article", lines.indexOf("^^^article")],
            ["words", lines.indexOf("^^^words")],
            ["notes", lines.indexOf("^^^notes")],
        ];
        positions.sort((a, b) => a[1] - b[1]);
        const filtered = positions.filter((v) => v[1] !== -1);
        filtered.push(["eof", lines.length]);
        const segments: Record<string, { start: number; end: number }> = {};
        for (let i = 0; i < filtered.length - 1; i++) {
            segments[filtered[i][0]] = { start: filtered[i][1] + 1, end: filtered[i + 1][1] };
        }
        return segments;
    }

    async readContent(type: string, create = false): Promise<string | null> {
        const oldText = await this.plugin.app.vault.read(this.file!);
        const lines = oldText.split("\n");
        const seg = this.divide(lines);
        if (!seg[type]) {
            if (create) {
                await this.plugin.app.vault.modify(this.file!, oldText + `\n^^^${type}\n\n`);
                return "";
            }
            return null;
        }
        return lines.slice(seg[type].start, seg[type].end).join("\n");
    }

    async writeContent(type: string, content: string): Promise<void> {
        const oldText = await this.plugin.app.vault.read(this.file!);
        const lines = oldText.split("\n");
        const seg = this.divide(lines);
        if (!seg[type]) return;
        const newText = lines.slice(0, seg[type].start).join("\n") +
            "\n" + content.trim() + "\n\n" +
            lines.slice(seg[type].end, lines.length).join("\n");
        await this.plugin.app.vault.modify(this.file!, newText);
    }
}