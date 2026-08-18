# Changelog

## 0.10.0 (2026-08-18) — P2/P3 优化轮

### A 类：假功能修真
- ✅ 新增「从 Language Learner 导入词库」命令（IndexedDB 迁移）
- ✅ 新增「导入 CSV」命令 + 文本粘贴对话框
- ✅ 新增「导入 Kindle 生词本」命令（TSV / 纯单词容错解析）
- ✅ 阅读视图开放入口命令（"在阅读视图中打开当前文件"）
- ✅ 双语翻译真实化：ReadingArea 双语按钮真正调翻译 API（DeepSeek / MyMemory / Youdao）+ 缓存
- ✅ 阅读内嵌复习修复：点击 Again/Hard/Good/Easy 真正更新 FSRS 卡片状态
- ✅ 今日学习面板真实挂载（ribbon + 命令均可打开）
- ✅ 词库列表面板挂载（DATA_PANEL_VIEW 注册 WordSidebarView，显示当前文档词汇）
- ✅ 复习队列面板挂载（REVIEW_QUEUE_VIEW 注册 ReviewQueueView）
- ✅ AI 导师真实化：ReviewModal 中「问 AI」按钮调用 AI provider 讲解单词
- ✅ AI 复习故事真实化：「生成 AI 复习故事」命令生成短文 + quiz 并保存笔记
- ✅ streak 连续天数真实打卡：复习完成后更新连续天数（StatView / TodaySession 可见）
- ✅ 字体/行距/弹窗查词等设置项立即生效（settings ↔ store 同步）
- ✅ 移除 popup_search / ReviewModal 中的 require() 动态调用，改为静态 import（消除潜在运行时崩溃）

### B 类：Anki 增强
- ✅ Anki 牌组映射：词 tag 含 `#deck/xxx` 时自动使用该 xxx 牌组
- ✅ Markdown → Anki HTML 转换：meaning / sentences 中的加粗、斜体、换行、列表正确渲染
- ✅ MD5 哈希缓存：跳过内容未变更的词条，变更时 updateNoteFields
- ✅ 默认牌组可配置（Settings → Anki → 默认牌组名称）

### C 类：清理与修复
- 修 manifest.json 描述乱码（UTF-8 正确写入）
- 统一版本号为 0.10.0（package.json / manifest.json / versions.json）
- sync.ts 去死代码（移除未使用的 classified 数组）
- word-store.getDueWords 统一过滤 status > 0，与 fsrs.getDueWords 一致
- ReviewModal.rate 传入 previousConsecutiveGood 修复状态推进失效 bug
- settings.ts 补全 UI：auto_pron 开关、词典开关、AI model、Anki 默认牌组、标签映射、数据库路径

### 技术细节
- 新增文件：utils/translation.ts、db/importers/kindle.ts、views/TextImportModal.ts、views/{WordSidebarView,ReviewQueueView,TodaySessionView}.ts
- 更新文件：main.ts / settings.ts / word-store.ts / ReadingArea.vue / BilingualView.vue / ReviewModal.vue / TodaySession.vue / WordSidebar.vue / auto-sync.ts / sync.ts
- 构建体积：~350 KB main.js / ~12 KB styles.css（含新增功能）

---

## 0.1.0 (2026-08-15)

### 10 阶段全部交付

**P0 — 项目骨架**（2026-08-15）
- 项目结构：Vite + Vue 3 + TypeScript + ts-fsrs
- 数据层：worddb.json 读写 + 内存 Map
- 跨设备同步：vault 内 JSON 文件

**P1 — 词典查词**
- 7 部词典引擎：Youdao / Cambridge / HJdict / DeepL / AI 释义 / 免费翻译 / 百度
- SearchPanel 视图：查词面板 + 历史记录 + 快速加词 + 复制

**P2 — 阅读视图**
- 英文分词引擎（retext-english + Aho-Corasick）
- ReadingView + ReadingArea：彩色高亮 + 分页 + 生词率条 + 难度评级
- 迷你复习弹出（内嵌复习，优化 C）

**P3 — 词库管理**
- LearnPanel 视图：表单化录入/编辑
- 多源导入：LL IndexedDB / CSV 词典
- 自动 .md 卡链接检测（优化 E）

**P4 — FSRS 复习**
- FSRS 间隔计算（Again/Hard/Good/Easy）
- 状态自动推进（优化 B）
- ReviewModal + ReviewQueue 视图

**P5 — Anki 导出**
- AnkiConnect 客户端（15 个 API 动作）
- 后台自动同步（5 分钟间隔）
- AI 造句批改

**P6 — 统计 + 流程**
- StatView 统计看板（掌握度分布 + 曝光追踪）
- TodaySession 今日引导（优化 G）
- WordSidebar 侧边栏词列表

**P7 — AI 抽象层**
- DeepSeek / OpenAI / Groq / 自定义 URL 统一接口

**P8 — 双语翻译**
- BilingualView 段落级双语翻译
- 5 种翻译样式（含学习掩码）
- 翻译缓存（LRU + content hash）
- 智能跳过规则
- 曝光追踪

**P9 — AI 复习故事**
- 每周用最近学的词生成短故事 + quiz

### 技术细节

- 构建体积：main.js 149 KB / styles.css 7.6 KB
- 源文件：62 个
- 类型检查：TypeScript strict mode ✅
- 构建工具：Vite 8 + Vue 3.5
- 依赖：ts-fsrs@5.4.1 / retext-english / unified