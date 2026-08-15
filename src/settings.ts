import { App, PluginSettingTab, Setting } from "obsidian";
import type StudyLoop from "./main";

export interface StudyLoopSettings {
    // 词典
    dictionaries: { [K in string]: { enable: boolean; priority: number } };
    dict_height: string;
    function_key: "ctrlKey" | "altKey" | "metaKey" | "disable";
    popup_search: boolean;
    auto_pron: boolean;

    // 阅读
    font_size: string;
    font_family: string;
    line_height: string;
    default_paragraphs: string;
    use_machine_trans: boolean;
    word_count: boolean;

    // 复习
    review_prons: "0" | "1";
    review_delimiter: string;
    review_db_preview: boolean;

    // AI
    ai_provider: string;
    ai_api_key: string;
    ai_model: string;
    ai_prompt_template: string;

    // 翻译
    translation_backend: string;
    translation_display_mode: "bilingual" | "translation-only" | "original-only";
    translation_style: "border" | "quote" | "muted" | "dashed" | "mask";

    // 数据
    db_name: string;
    word_database: string;
    review_database: string;
    col_delimiter: "," | "\t" | "|";
    auto_refresh_db: boolean;
    search_history: string[];
}

export const DEFAULT_SETTINGS: StudyLoopSettings = {
    dictionaries: {
        "youdao": { enable: true, priority: 1 },
        "cambridge": { enable: true, priority: 2 },
        "hjdict": { enable: true, priority: 3 },
        "deepl": { enable: true, priority: 4 },
    },
    dict_height: "250px",
    function_key: "altKey",
    popup_search: true,
    auto_pron: true,

    font_size: "15px",
    font_family: '"Times New Roman"',
    line_height: "1.8em",
    default_paragraphs: "4",
    use_machine_trans: true,
    word_count: true,

    review_prons: "0",
    review_delimiter: "?",
    review_db_preview: true,

    ai_provider: "",
    ai_api_key: "",
    ai_model: "deepseek-v4-flash",
    ai_prompt_template: "用中文给出 {{word}} 的简短释义和用法。",

    translation_backend: "deepseek",
    translation_display_mode: "bilingual",
    translation_style: "mask",

    db_name: "StudyLoopDB",
    word_database: "0单词卡片盒/词汇统计.txt",
    review_database: "0单词卡片盒/复习数据.txt",
    col_delimiter: ",",
    auto_refresh_db: true,
    search_history: [],
};

export class SettingTab extends PluginSettingTab {
    plugin: StudyLoop;

    constructor(app: App, plugin: StudyLoop) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h1", { text: "StudyLoop 设置" });

        // 词典设置
        containerEl.createEl("h3", { text: "词典" });
        new Setting(containerEl)
            .setName("功能键")
            .setDesc("选词时按哪个键触发查词")
            .addDropdown(d => d
                .addOption("ctrlKey", "Ctrl")
                .addOption("altKey", "Alt")
                .addOption("metaKey", "Meta")
                .addOption("disable", "禁用")
                .setValue(this.plugin.settings.function_key)
                .onChange(async (v) => {
                    this.plugin.settings.function_key = v as any;
                    await this.plugin.saveSettings();
                })
            );
        new Setting(containerEl)
            .setName("弹窗查词")
            .setDesc("选中词后自动弹出查词面板")
            .addToggle(t => t.setValue(this.plugin.settings.popup_search)
                .onChange(async (v) => { this.plugin.settings.popup_search = v; await this.plugin.saveSettings(); }));

        // AI 设置
        containerEl.createEl("h3", { text: "AI 辅助" });
        new Setting(containerEl)
            .setName("AI 提供商")
            .setDesc("配置 AI API 用于释义、翻译、造句批改等")
            .addText(t => t.setValue(this.plugin.settings.ai_provider)
                .setPlaceholder("https://api.deepseek.com")
                .onChange(async (v) => { this.plugin.settings.ai_provider = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("API Key")
            .addText(t => t.setValue(this.plugin.settings.ai_api_key)
                .setPlaceholder("sk-...")
                .onChange(async (v) => { this.plugin.settings.ai_api_key = v; await this.plugin.saveSettings(); }));

        // 翻译设置
        containerEl.createEl("h3", { text: "双语翻译" });
        new Setting(containerEl)
            .setName("翻译后端")
            .addDropdown(d => d
                .addOption("deepseek", "DeepSeek")
                .addOption("baidu", "百度翻译")
                .addOption("youdao", "有道智云")
                .addOption("mymemory", "MyMemory（免费）")
                .setValue(this.plugin.settings.translation_backend)
                .onChange(async (v) => { this.plugin.settings.translation_backend = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("显示模式")
            .addDropdown(d => d
                .addOption("bilingual", "双语对照")
                .addOption("translation-only", "仅翻译")
                .addOption("original-only", "仅原文")
                .setValue(this.plugin.settings.translation_display_mode)
                .onChange(async (v) => { this.plugin.settings.translation_display_mode = v as any; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("翻译样式")
            .addDropdown(d => d
                .addOption("border", "边框")
                .addOption("quote", "引用")
                .addOption("muted", "灰色")
                .addOption("dashed", "虚线下划线")
                .addOption("mask", "学习掩码（模糊+悬停）")
                .setValue(this.plugin.settings.translation_style)
                .onChange(async (v) => { this.plugin.settings.translation_style = v as any; await this.plugin.saveSettings(); }));

        // 复习设置
        containerEl.createEl("h3", { text: "复习" });
        new Setting(containerEl)
            .setName("口音")
            .addDropdown(d => d
                .addOption("0", "美式")
                .addOption("1", "英式")
                .setValue(this.plugin.settings.review_prons)
                .onChange(async (v) => { this.plugin.settings.review_prons = v as any; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("同步前预览")
            .setDesc("同步复习数据库前显示预览")
            .addToggle(t => t.setValue(this.plugin.settings.review_db_preview)
                .onChange(async (v) => { this.plugin.settings.review_db_preview = v; await this.plugin.saveSettings(); }));

        // 阅读设置
        containerEl.createEl("h3", { text: "阅读" });
        new Setting(containerEl)
            .setName("字体大小")
            .addText(t => t.setValue(this.plugin.settings.font_size)
                .onChange(async (v) => { this.plugin.settings.font_size = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("字体系列")
            .addText(t => t.setValue(this.plugin.settings.font_family)
                .onChange(async (v) => { this.plugin.settings.font_family = v; await this.plugin.saveSettings(); }));
    }
}