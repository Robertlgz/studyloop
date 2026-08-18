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

    // Anki
    anki_deck: string;
    anki_enable_tag_mapping: boolean;

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
        "ai": { enable: true, priority: 5 },
        "free": { enable: false, priority: 6 },
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
    anki_deck: "StudyLoop",
    anki_enable_tag_mapping: true,

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

        // ========== 词典 ==========
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
                    this.plugin.syncSettingsToStore?.();
                })
            );
        new Setting(containerEl)
            .setName("弹窗查词")
            .setDesc("选中词后自动弹出查词面板")
            .addToggle(t => t.setValue(this.plugin.settings.popup_search)
                .onChange(async (v) => { this.plugin.settings.popup_search = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("自动发音")
            .setDesc("查词时自动播放单词发音")
            .addToggle(t => t.setValue(this.plugin.settings.auto_pron)
                .onChange(async (v) => { this.plugin.settings.auto_pron = v; await this.plugin.saveSettings(); }));
        // 词典开关（简化：显示已启用的列表）
        const dictDiv = containerEl.createDiv({ cls: "sl-dict-toggles" });
        for (const [id, cfg] of Object.entries(this.plugin.settings.dictionaries)) {
            new Setting(dictDiv)
                .setName(id)
                .addToggle(t => t.setValue(cfg.enable)
                    .onChange(async (v) => {
                        this.plugin.settings.dictionaries[id] = { ...cfg, enable: v };
                        await this.plugin.saveSettings();
                    }));
        }

        // ========== AI ==========
        containerEl.createEl("h3", { text: "AI 辅助" });
        new Setting(containerEl)
            .setName("AI 提供商地址")
            .setDesc("例如 https://api.deepseek.com，留空则使用默认")
            .addText(t => t.setValue(this.plugin.settings.ai_provider)
                .setPlaceholder("https://api.deepseek.com")
                .onChange(async (v) => { this.plugin.settings.ai_provider = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("API Key")
            .addText(t => t.setValue(this.plugin.settings.ai_api_key)
                .setPlaceholder("sk-...")
                .onChange(async (v) => { this.plugin.settings.ai_api_key = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("模型名称")
            .addText(t => t.setValue(this.plugin.settings.ai_model)
                .setPlaceholder("deepseek-v4-flash")
                .onChange(async (v) => { this.plugin.settings.ai_model = v; await this.plugin.saveSettings(); }));

        // ========== 双语翻译 ==========
        containerEl.createEl("h3", { text: "双语翻译" });
        new Setting(containerEl)
            .setName("翻译后端")
            .addDropdown(d => d
                .addOption("deepseek", "DeepSeek AI（推荐，需 API Key）")
                .addOption("mymemory", "MyMemory（免费）")
                .addOption("youdao", "有道网页翻译（免费）")
                .addOption("baidu", "百度翻译（需 AI Key 降级）")
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
                .addOption("border", "左边框")
                .addOption("quote", "引用风格")
                .addOption("muted", "灰色淡化")
                .addOption("dashed", "虚线下划线")
                .addOption("mask", "学习掩码（模糊+悬停查看）")
                .setValue(this.plugin.settings.translation_style)
                .onChange(async (v) => { this.plugin.settings.translation_style = v as any; await this.plugin.saveSettings(); }));

        // ========== 复习 ==========
        containerEl.createEl("h3", { text: "复习" });
        new Setting(containerEl)
            .setName("口音")
            .addDropdown(d => d
                .addOption("0", "美式")
                .addOption("1", "英式")
                .setValue(this.plugin.settings.review_prons)
                .onChange(async (v) => { this.plugin.settings.review_prons = v as any; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("自动刷新数据库")
            .setDesc("词库变更后自动同步复习数据 / 词汇统计")
            .addToggle(t => t.setValue(this.plugin.settings.auto_refresh_db)
                .onChange(async (v) => { this.plugin.settings.auto_refresh_db = v; await this.plugin.saveSettings(); }));

        // ========== Anki ==========
        containerEl.createEl("h3", { text: "Anki 同步" });
        new Setting(containerEl)
            .setName("默认牌组名称")
            .setDesc("新词默认同步到此牌组；若词的 tag 含 #deck/xxx 则使用 xxx 牌组")
            .addText(t => t.setValue(this.plugin.settings.anki_deck)
                .setPlaceholder("StudyLoop")
                .onChange(async (v) => { this.plugin.settings.anki_deck = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("启用标签牌组映射")
            .setDesc("当词的 tags 包含 #deck/<name> 时，使用该 name 作为 Anki 牌组名")
            .addToggle(t => t.setValue(this.plugin.settings.anki_enable_tag_mapping !== false)
                .onChange(async (v) => { this.plugin.settings.anki_enable_tag_mapping = v; await this.plugin.saveSettings(); }));

        // ========== 阅读 ==========
        containerEl.createEl("h3", { text: "阅读" });
        new Setting(containerEl)
            .setName("字体大小")
            .addText(t => t.setValue(this.plugin.settings.font_size)
                .onChange(async (v) => {
                    this.plugin.settings.font_size = v;
                    await this.plugin.saveSettings();
                    this.plugin.store.fontSize = v;
                }));
        new Setting(containerEl)
            .setName("字体系列")
            .addText(t => t.setValue(this.plugin.settings.font_family)
                .onChange(async (v) => {
                    this.plugin.settings.font_family = v;
                    await this.plugin.saveSettings();
                    this.plugin.store.fontFamily = v;
                }));
        new Setting(containerEl)
            .setName("行高")
            .addText(t => t.setValue(this.plugin.settings.line_height)
                .onChange(async (v) => {
                    this.plugin.settings.line_height = v;
                    await this.plugin.saveSettings();
                    this.plugin.store.lineHeight = v;
                }));

        // ========== 数据库 ==========
        containerEl.createEl("h3", { text: "数据库路径" });
        new Setting(containerEl)
            .setName("词汇统计路径")
            .addText(t => t.setValue(this.plugin.settings.word_database)
                .setPlaceholder("0单词卡片盒/词汇统计.txt")
                .onChange(async (v) => { this.plugin.settings.word_database = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("复习数据路径")
            .addText(t => t.setValue(this.plugin.settings.review_database)
                .setPlaceholder("0单词卡片盒/复习数据.txt")
                .onChange(async (v) => { this.plugin.settings.review_database = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl)
            .setName("分隔符")
            .addDropdown(d => d
                .addOption(",", "逗号")
                .addOption("\t", "制表符")
                .addOption("|", "竖线")
                .setValue(this.plugin.settings.col_delimiter)
                .onChange(async (v) => { this.plugin.settings.col_delimiter = v as any; await this.plugin.saveSettings(); }));
    }
}
