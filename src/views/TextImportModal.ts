// 文本导入对话框（CSV / Kindle / 其他粘贴格式）
import { App, Modal } from "obsidian";

export interface ImportResult {
    count: number;
    message: string;
}

export class TextImportModal extends Modal {
    readonly title: string;
    readonly placeholder: string;
    readonly onImport: (text: string) => Promise<number>;
    textarea: HTMLTextAreaElement;

    constructor(app: App, title: string, placeholder: string, onImport: (text: string) => Promise<number>) {
        super(app);
        this.title = title;
        this.placeholder = placeholder;
        this.onImport = onImport;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("p", { text: "将导出的文本粘贴到下方（每行一个词条）：" });
        this.textarea = contentEl.createEl("textarea", {
            cls: "sl-import-textarea",
            attr: { rows: 12, placeholder: this.placeholder },
        });
        contentEl.createEl("br");
        contentEl.createEl("p", { text: "支持的格式：CSV（word,meaning）/ TSV / My Clippings / Kindle vocabulary TSV" });

        const btnRow = contentEl.createDiv({ cls: "sl-import-btn-row" });
        btnRow.createEl("button", { text: "导入" }).addEventListener("click", () => this.submit());
        contentEl.createEl("button", { text: "取消", cls: "mod-cancel" }).addEventListener("click", () => this.close());
    }

    async submit(): Promise<void> {
        const text = this.textarea.value.trim();
        if (!text) {
            new Notice("请先粘贴要导入的文本");
            return;
        }
        try {
            const count = await this.onImport(text);
            this.close();
            new Notice(`✅ 已导入 ${count} 个词`);
        } catch (e) {
            new Notice("❌ 导入失败：" + ((e as Error).message || e));
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}