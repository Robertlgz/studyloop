# StudyLoop · 英语学习闭环

> 阅读、查词、复习、Anki 导出、AI 辅助全合一语言学习插件（Obsidian）

**蒸馏自**：[Language Learner](https://github.com/guopenghui/obsidian-language-learner) + [Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) + [Obsidian_to_Anki](https://github.com/Pseudonium/Obsidian_to_Anki)
**借鉴自**：HiWords / huanmuyu / Interlinear / language-recall / Kindle Vocab / Chinese Comprehensible Input

---

## ✨ 功能

| 模块 | 功能 |
|---|---|
| 🔍 **查词** | 7 部词典（Youdao / Cambridge / HJdict / DeepL / AI / 免费翻译 / 百度） |
| 📖 **阅读** | 彩色生词高亮 + 内嵌复习 + 分页 + 生词率条 + 难度评级 |
| 🌐 **双语翻译** | 段落级翻译 + 5 种样式（含学习掩码模糊+悬停） |
| 🔄 **复习** | FSRS 间隔算法 + 状态自动推进 + 复习队列 |
| 🎴 **Anki 导出** | 自动后台同步 AnkiConnect |
| 📝 **词库管理** | 多源导入（LL / CSV / Kindle）+ 标签 + 例句 |
| 🤖 **AI 辅助** | 释义生成 + 造句批改 + 导师追问 + 复习故事 |
| 📊 **统计** | 掌握度分布 + 曝光追踪 + 连续学习天数 |
| 🚀 **今日流程** | 一键引导：复习 → 推荐阅读 → 总结 |
| 📋 **侧边栏** | 当前文档词列表 + 复习队列 |
| 💾 **跨设备** | worddb.json 在 vault 内，Resilio 自动同步 |

---

## 🚀 快速开始

### 安装

1. 从 [Releases](https://github.com/Robertlgz/studyloop/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 放入 `<你的 vault>/.obsidian/plugins/studyloop/`
3. 启用插件

### 首次使用

1. **导入词库**：命令面板 → `StudyLoop: Import from Language Learner`（如有旧数据）
2. **配置 AI**：Settings → AI 辅助 → 填入 DeepSeek API Key
3. **开始查词**：选中单词 → 按 `Alt` → 查词面板弹出
4. **开始复习**：命令面板 → `StudyLoop: 复习待复习词`

### 快捷键

| 快捷键 | 命令 |
|---|---|
| `Alt+T` | 查词 |
| `Alt+N` | 新词面板 |
| `Alt+D` | 复习 |
| `Alt+J` | 今日学习 |

---

## ⚙️ 配置

Settings → StudyLoop，主要配置项：

| 分组 | 配置项 |
|---|---|
| 词典 | 功能键、弹窗查词、7 部词典开关 |
| AI 辅助 | API Key、Model、自定义 Prompt |
| 翻译 | 翻译后端、显示模式、样式 |
| 复习 | 口音、同步前预览 |
| 阅读 | 字体大小、字体系列 |

---

## 🔧 开发

```bash
git clone https://github.com/Robertlgz/studyloop.git
cd studyloop
npm install
npm run build    # 生产构建
npm run dev      # 开发模式（watch）
```

### 项目结构

```
src/
├── main.ts                    ← 插件入口
├── store.ts                   ← Vue reactive store
├── settings.ts                ← 统一设置
├── db/word-store.ts           ← worddb.json 读写
├── dictionary/                ← 7 部词典引擎
├── parser/                    ← 英文分词
├── scheduling/fsrs.ts         ← 复习算法
├── anki/                      ← AnkiConnect 集成
├── ai/                        ← AI 抽象层 + 造句/故事
├── views/                     ← 10 个 Vue 组件
└── utils/                     ← 工具函数
```

---

## 📦 发布

打 tag 自动触发 GitHub Actions 构建 Release：

```bash
npm version patch
git push && git push --tags
```

---

## 📄 许可

MIT

## 🙏 致谢

- [Language Learner](https://github.com/guopenghui/obsidian-language-learner) — 阅读视图 + 多词典查词
- [Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) — FSRS 算法
- [Obsidian_to_Anki](https://github.com/Pseudonium/Obsidian_to_Anki) — AnkiConnect 集成
- [HiWords](https://github.com/CatMuse/HiWords) — 悬停弹窗 + Canvas 词库
- [Interlinear](https://github.com/linyp/obsidian-interlinear) — 双语翻译 + 学习掩码
- [huanmuyu](https://github.com/jiangzizhao/huanmuyu-plugin) — AI 造句批改 + 分级阅读
- [language-recall](https://github.com/ChasKane/language-recall) — AI 导师
- [Kindle Vocab](https://github.com/bao-tg/kindle-vocab) — Kindle 导入
- [Chinese Comprehensible Input](https://github.com/davadev/obsidian_chinese_comprehensible_input) — 曝光追踪 + AI 复习故事