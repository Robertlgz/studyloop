# StudyLoop · 英语学习闭环

> 阅读、查词、复习、Anki 导出、AI 辅助全合一语言学习插件（Obsidian）
> **版本**：0.10.4 · **框架**：Vue 3.5 + Vite 8 + TypeScript + ts-fsrs@5.4.1

**蒸馏自**：[Language Learner](https://github.com/guopenghui/obsidian-language-learner) + [Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) + [Obsidian_to_Anki](https://github.com/Pseudonium/Obsidian_to_Anki)
**借鉴自**：HiWords / huanmuyu / Interlinear / language-recall / Kindle Vocab / Chinese Comprehensible Input

---

## ✨ 功能总览

| 模块 | 功能 |
|---|---|
| 🔍 **查词** | 7 部词典（Youdao / Cambridge / HJdict / DeepL / AI 释义 / 免费翻译 / 百度），**多源并行查询**，弹窗拖拽浮动，短语支持 |
| 📖 **阅读** | 彩色生词高亮 + 内嵌 FSRS 复习 + 分页 + 生词率条 + 难度评级 + 双语翻译 |
| 🌐 **双语翻译** | 段落级真实翻译（DeepSeek / MyMemory / Youdao），5 种样式（含学习掩码模糊+悬停） |
| 🔄 **复习** | 真实 FSRS 间隔算法 + 状态自动推进 + streak 连续天数 + 复习队列 + AI 导师追问 |
| 🎴 **Anki 导出** | 自动后台同步（牌组映射 / MD→HTML / 哈希缓存 / update vs add） |
| 📝 **词库管理** | 多源导入（LL IndexedDB / CSV / Kindle TSV）+ 标签 + 例句 + `.md` 卡链接检测 |
| 🤖 **AI 辅助** | 释义生成 + 造句批改 + 导师追问 + 复习故事生成（保存为 md 笔记） |
| 📊 **统计** | 掌握度分布 + 曝光追踪 + 连续学习天数 |
| 🚀 **今日流程** | 一键引导：复习 → 推荐阅读 → 总结 |
| 📋 **侧边栏** | 当前文档词列表（词库列表）+ 复习队列 |
| 💾 **跨设备** | 词库 `data.json` 在 vault 内，Resilio / 任何 vault 同步工具自动同步 |

---

## 🚀 快速开始

### 安装

1. 从 [Releases](https://github.com/Robertlgz/studyloop/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 放入 `<你的 vault>/.obsidian/plugins/studyloop/`
3. 完全重启 Obsidian（关窗口 + 托盘退出），重新打开
4. 社区插件 → 启用 `StudyLoop`

### 首次使用

1. **配置 AI**（推荐）：Settings → StudyLoop → AI 辅助 → 填入 DeepSeek API Key
2. **导入旧词库**（如有）：命令面板 → `StudyLoop: 从 Language Learner 导入词库`
3. **开始查词**：选中单词 → 按 `Alt` → 弹窗显示多源结果（可拖动固定位置）
4. **开始复习**：命令面板 → `StudyLoop: 复习待复习词`
5. **阅读文章**：命令面板 → `StudyLoop: 在阅读视图中打开当前文件`

### 常用命令（命令面板搜 `StudyLoop`）

| 命令 | 用途 |
|---|---|
| `StudyLoop: 查词` | 手动触发查词（有选区查选区，无选区打开面板） |
| `StudyLoop: 划词翻译（选中文字）` | 选中文字后触发查词 |
| `StudyLoop: 复习待复习词` | 打开复习卡片模态框 |
| `StudyLoop: 开始今日学习` | 打开今日学习面板 |
| `StudyLoop: 在阅读视图中打开当前文件` | 以阅读视图打开当前笔记 |
| `StudyLoop: 打开复习队列侧边栏` | 右侧打开复习队列 |
| `StudyLoop: 从 Language Learner 导入词库` | IndexedDB 迁移 |
| `StudyLoop: 导入 CSV` | 粘贴文本导入 CSV 格式词库 |
| `StudyLoop: 导入 Kindle 生词本` | 粘贴 Kindle TSV 生词本文本 |
| `StudyLoop: 生成 AI 复习故事` | 用最近学的词生成故事 + quiz |
| `StudyLoop: 立即同步 Anki` | 手动触发 AnkiConnect 同步 |
| `StudyLoop: 同步复习数据库` | 写复习数据.txt + 词汇统计.txt |

---

## ⚙️ 配置说明

Settings → StudyLoop：

| 分组 | 关键配置 | 说明 |
|---|---|---|
| **词典** | 功能键（Alt/Ctrl/Meta/禁用） | 触发划词翻译的功能键 |
| | 弹窗查词（开关） | 选中词后自动弹浮动窗 |
| | 自动发音（开关） | 查词时自动播放单词发音 |
| | 词典开关 | 启用/禁用各部词典 |
| **AI 辅助** | AI 提供商地址 | 默认 `https://api.deepseek.com` |
| | API Key | DeepSeek / OpenAI 兼容 key |
| | 模型名称 | 默认 `deepseek-v4-flash` |
| **双语翻译** | 翻译后端 | DeepSeek AI / MyMemory / 有道网页 |
| | 显示模式 | 双语对照 / 仅翻译 / 仅原文 |
| | 翻译样式 | 边框 / 引用 / 灰色 / 虚线 / 学习掩码 |
| **复习** | 口音（美式/英式） | 发音音频来源 |
| | 自动刷新数据库 | 词库变更后自动写 .txt 同步文件 |
| **Anki 同步** | 默认牌组名称 | 新词默认同步到的牌组 |
| | 启用标签牌组映射 | 词 tag 含 `#deck/xxx` 时自动使用 xxx 牌组 |
| **阅读** | 字体大小 / 字体系列 / 行高 | 阅读视图排版 |
| **数据库路径** | 词汇统计 / 复习数据路径 | 与 Various Complements 联动的 .txt 路径 |

---

## 🔧 开发

```bash
git clone https://github.com/Robertlgz/studyloop.git
cd studyloop
npm install
npm run build    # 生产构建 → main.js + styles.css
npm run dev      # 开发构建（带 sourcemap）
npm run typecheck  # TypeScript 类型检查
```

### 项目结构

```
src/
├── main.ts                    ← 插件入口，命令注册，视图挂载
├── store.ts                   ← Vue reactive store（字体/主题等）
├── settings.ts                ← 统一设置 interface + SettingTab UI
├── db/
│   ├── word-store.ts          ← WordStore：词库读写 + streak + 翻译缓存
│   ├── sync.ts                ← 同步复习数据.txt / 词汇统计.txt
│   └── importers/
│       ├── ll-indexeddb.ts    ← LL IndexedDB 迁移
│       ├── csv.ts             ← CSV 导入
│       └── kindle.ts          ← Kindle TSV 导入
├── dictionary/
│   ├── engine.ts              ← DictionaryEngine 接口
│   ├── list.ts                ← searchAll / searchAllParallel
│   ├── helpers.ts             ← fetchDirtyDOM / getInnerHTML 等
│   ├── uses.ts                ← useLoading hook
│   ├── youdao/                ← 有道词典（释义+柯林斯+辨析+词组）
│   ├── cambridge/             ← 剑桥词典
│   ├── hjdict/                ← 沪江小D
│   ├── deepl/                 ← DeepL 翻译
│   ├── ai/                    ← AI 释义（DeepSeek/OpenAI/Groq）
│   └── free/                  ← MyMemory 免费翻译
├── parser/
│   └── index.ts               ← retext-english 分词 + 状态高亮 + 难度计算
├── scheduling/
│   └── fsrs.ts                ← ts-fsrs@5.4.1 包装：calculateNextDue / getDueWords
├── anki/
│   ├── anki-connect.ts        ← AnkiConnect HTTP 客户端（15 个 API 动作）
│   └── auto-sync.ts           ← 自动同步（牌组映射 / MD→HTML / 哈希缓存）
├── ai/
│   ├── provider.ts            ← AI 抽象层（DeepSeek / OpenAI / Groq）
│   ├── sentence-corrector.ts  ← AI 造句批改
│   └── story-generator.ts     ← AI 复习故事生成
├── views/
│   ├── SearchPanel.vue        ← 侧边栏查词面板（多源 Tab + 历史）
│   ├── SearchPanelView.ts     ← ItemView 包装
│   ├── ReadingView.ts         ← TextFileView（阅读视图）
│   ├── ReadingArea.vue        ← 阅读区（分词高亮 + 内嵌复习 + 双语切换）
│   ├── LearnPanel.vue         ← 生词录入表单
│   ├── LearnPanelView.ts
│   ├── StatView.vue           ← 统计看板
│   ├── StatView.ts
│   ├── PopupSearch.vue        ← 浮动弹窗（多源 + 拖拽 + 短语 + 历史）
│   ├── ReviewModal.vue        ← 复习卡片（FSRS + AI 导师）
│   ├── ReviewModalWrapper.ts  ← Obsidian Modal 包装
│   ├── ReviewQueue.vue        ← 复习队列列表
│   ├── ReviewQueueView.ts
│   ├── WordSidebar.vue        ← 词库列表（当前文档词汇）
│   ├── WordSidebarView.ts
│   ├── TodaySession.vue       ← 今日学习面板
│   ├── TodaySessionView.ts
│   ├── BilingualView.vue      ← 双语翻译组件（真实 API 调用）
│   └── TextImportModal.ts     ← CSV/Kindle 导入对话框
├── utils/
│   ├── translation.ts         ← translateText（MyMemory/AI/有道）
│   ├── translation-cache.ts   ← 翻译 LRU 缓存
│   ├── translation-skip.ts    ← 智能跳过规则
│   └── exposure.ts            ← 曝光追踪
└── lang/
    └── helper.ts              ← 语言工具函数
```

---

## 📦 发布

```bash
npm version patch   # 自动更新 package.json / manifest.json / versions.json
git add -A
git commit -m "Bump to vX.Y.Z"
git push && git push --tags
```

GitHub Actions 会在 push tag 时自动构建 Release 并上传 `main.js` / `styles.css` / `manifest.json`。

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
