# Changelog

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