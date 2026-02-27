# Task Plan: 个人 AI 工作台网站

## Goal
构建一个可扩展的个人 AI 工作台网站，集成文案撰写、数据分析、视频分析三大核心工具，并通过插件化架构支持后续无缝添加新工具。

## Current Phase
Phase 3 — Dashboard 与导航系统（完成），Phase 4 工具实现中

## Phases

### Phase 1: 需求分析与架构设计
- [x] 理解用户需求
- [ ] 确定技术栈
- [ ] 定义插件化扩展机制
- [ ] 设计数据流与 API 结构
- [ ] 记录架构决策到 findings.md
- **Status:** in_progress

### Phase 2: 项目初始化与核心基础设施
- [x] 初始化项目（Next.js 16 + TypeScript + Tailwind）
- [x] 安装全部依赖（Claude SDK、NextAuth v5、Zustand、Recharts 等）
- [x] shadcn/ui 初始化 + 组件安装
- [x] NextAuth Credentials 认证配置（auth.ts + proxy.ts）
- [x] Tool Registry 实现（lib/tool-registry.ts）
- [x] Claude API 封装 + SSE 流式响应（lib/claude.ts）
- [x] Zustand Store（lib/store.ts，history + sidebar）
- [x] 共用组件（StreamingOutput + consumeStream）
- [x] 布局框架（Sidebar + Header + 根布局）
- [x] .env.example + .env.local + AUTH_SECRET
- [x] next.config.ts（standalone output for Docker）
- [x] npm run build 验证通过（0 错误 0 警告）
- **Status:** complete

### Phase 3: Dashboard 与导航系统
- [x] 首页 Dashboard（工具卡片网格，带图标/颜色/标签）
- [x] 侧边栏导航（支持动态注册工具，可折叠）
- [x] 工具详情页动态路由 /tools/[toolId]
- [x] Zustand 状态管理（历史、侧边栏开关）
- **Status:** complete

### Phase 4a: 文案撰写工具
- [x] 生成模式（博客/社媒/邮件/广告/产品描述/演讲稿）
- [x] 润色 / 改写 / 翻译（四 Tab 切换）
- [x] 风格参数（专业/轻松/幽默/感性/简洁）+ 长度选择
- [x] 流式输出（SSE），光标动画
- [x] 历史保存（Zustand persist）+ 恢复到输出区
- [x] 复制、清空、字数显示
- [x] API 路由鉴权（session 验证）
- [x] npm run build 通过
- **Status:** complete

### Phase 4b: 数据分析工具
- [x] CSV / Excel (.xlsx/.xls) 拖拽上传与解析（Papaparse + xlsx）
- [x] 数据预览表格（前 8/50 行，可展开，列名点击可插入问题）
- [x] 自然语言提问（流式 AI 分析，⌘Enter 快捷键）
- [x] 自动图表（bar/line/area/pie，AI 选类型 + 数据，Recharts 渲染）
- [x] 导出 Markdown 分析报告（本地下载）
- [x] 复制 / 保存历史 / 换文件
- [x] 两个 API 路由（/data-analysis + /data-analysis/chart）
- [x] npm run build 通过
- **Status:** complete

### Phase 4c: 视频分析工具
- [x] YouTube / B站 URL 输入，平台自动识别
- [x] 两级转录策略：youtube-transcript（原始字幕）→ yt-dlp + Whisper（兜底）
- [x] 转录展示（可折叠，字符数，来源 badge，超长自动截断）
- [x] 摘要生成（结构化：主题/要点/关键信息/评价）
- [x] 章节划分（带时间戳范围 + 内容概要）
- [x] 问答模式（基于转录内容，⌘Enter 快捷键，可连续提问）
- [x] 两个 API 路由（/transcript + /analyze）
- [x] npm run build 通过
- **Status:** complete

### Phase 5: 插件扩展系统
- [x] 工具配置文件格式定义（tool-manifest.ts）
- [x] 一键注册新工具的脚手架脚本
- [x] 工具分类与标签系统
- [x] 工具开关（启用/禁用）
- **Status:** complete

### Phase 6: 测试与打磨
- [ ] 各工具功能验证
- [ ] 响应式布局适配
- [ ] 错误处理与边界情况
- [ ] 性能优化（流式响应、懒加载）
- [x] Dockerfile（multi-stage，含 yt-dlp + ffmpeg）
- [x] docker-compose.yml（app + nginx 服务）
- [x] nginx/nginx.conf（SSL + proxy_buffering off + 300s 超时）
- **Status:** in_progress

## Key Questions
1. ✅ 是否需要用户认证？→ **需要基础认证**（NextAuth + Credentials）
2. ✅ 部署目标？→ **VPS**（Docker + Nginx + Let's Encrypt）
3. ✅ 视频输入方式？→ **URL 输入**（YouTube/B站，无需文件上传）
4. ✅ 是否有 API Key？→ **已有**（ANTHROPIC_API_KEY + OPENAI_API_KEY）
5. 数据是否持久化？→ **localStorage**（个人使用，无需数据库）

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Next.js 15 (App Router) | 文件系统路由天然支持插件化工具页，SSR/API Routes 一体化 |
| TypeScript | 工具 manifest 类型安全，重构更可靠 |
| Tailwind CSS + shadcn/ui | 快速构建一致 UI，shadcn 组件可定制 |
| Anthropic Claude API | 最适合文案/分析/多模态任务 |
| Tool Registry 模式 | 新工具只需注册配置，无需修改核心导航代码 |
| Zustand 状态管理 | 轻量，无样板代码，适合个人项目 |
| NextAuth.js v5 + Credentials | 基础认证，用户名/密码存 .env，无需数据库 |
| Docker + Nginx + Let's Encrypt | VPS 部署标准方案，SSL 免费自动续期 |
| 视频 URL 而非上传 | 避免存储大文件，youtube-transcript 优先，yt-dlp 兜底 |
| localStorage 历史记录 | 无需数据库，快速启动；后续可迁移到 DB |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| npm cache 权限（root 所有）导致 install 失败 | 1 | 使用 npm_config_cache=/tmp/npm-cache 绕过 |
| create-next-app 目录已存在冲突 | 2 | 直接在已有目录运行 npm install |
| middleware.ts 在 Next.js 16 已弃用 | 1 | 重命名为 proxy.ts，导出 proxy 函数 |
| proxy.ts 类型不兼容（NextRequest vs NextAuthMiddleware）| 1 | 用 `as any` 绕过类型冲突 |

## Notes
- 核心设计原则：**工具即插件**，新增工具 = 创建一个文件夹 + 注册到工具表
- API Key 通过 .env.local 管理，不提交到版本库
- 流式响应优先，提升体验
