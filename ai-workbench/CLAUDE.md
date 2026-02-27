# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 常用命令

```bash
npm run dev        # 启动开发服务器（Next.js 16 + Turbopack），地址 localhost:3000
npm run build      # 生产构建（output: standalone）
npm run start      # 启动生产服务器
npm run lint       # 运行 ESLint
```

后台启动开发服务器并查看日志：
```bash
nohup npm run dev > /tmp/next-dev.log 2>&1 &
tail -f /tmp/next-dev.log
```

## 架构说明

### 工具插件系统

每个工具由三个部分组成，必须同时配置：

1. **`tools/{name}/manifest.ts`** — `ToolManifest` 元数据（id、name、icon、category、accentColor、组件引用）
2. **`tools/{name}/component.tsx`** — 在 `/tools/{id}` 渲染的 React UI 组件
3. **`app/api/tools/{name}/route.ts`** — 后端 POST 处理函数

新增工具时，将 manifest 导入 `lib/tool-registry.ts` 并添加到 `TOOL_REGISTRY` 数组即可。仪表盘、侧边栏和路由均自动生效。

### LLM 集成

所有文本生成均通过 `lib/claude.ts` 中的 OpenAI 兼容客户端经由 OpenRouter 完成，baseURL 为 `https://openrouter.ai/api/v1`。默认模型为 `anthropic/claude-opus-4`（可通过 `OPENROUTER_MODEL` 环境变量覆盖）。

**所有 AI 路由使用的 SSE 流式模式：**
- API 路由调用 `lib/claude.ts` 中的 `createStreamResponse(messages, system, model, maxTokens)`
- 流格式：`data: {"text":"..."}\n\n`，结束标志 `data: [DONE]\n\n`，错误格式 `data: {"error":"..."}\n\n`
- 前端通过 `components/shared/StreamingOutput.tsx` 中的 `consumeStream()` 消费

### 身份认证

通过 NextAuth.js v5 实现单用户凭证认证。凭证在 `.env.local` 中以 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 配置。所有 API 路由均需 `await auth()` 会话校验，未登录返回 401。

**注意：** 在 Next.js 16 中，中间件文件命名为 `proxy.ts`（非 `middleware.ts`），导出名为 `proxy`（非 `middleware`）。

### 视频转录

`app/api/tools/video-analysis/transcript/route.ts` 中的双策略回退机制：
1. YouTube 原生字幕（通过 `youtube-transcript` 库）——速度快
2. yt-dlp + Whisper——所有 URL 的兜底方案，需要 `yt-dlp` 和 `ffmpeg` 系统二进制文件

`resolveBin()` 辅助函数负责解析系统二进制的绝对路径（避免 child_process PATH 继承问题）。Whisper 接口可通过 `WHISPER_API_KEY` / `WHISPER_BASE_URL` / `WHISPER_MODEL` 完全配置，默认使用 Groq 免费 API。

### 状态管理

`lib/store.ts` 中的 Zustand store，通过 localStorage 持久化。管理：
- 各工具的历史记录（最多 50 条）
- 侧边栏折叠状态

## 环境变量

| 变量 | 用途 |
|------|------|
| `OPENROUTER_API_KEY` | 必填——所有文本生成的主 LLM 接口 |
| `OPENROUTER_MODEL` | 可选，覆盖模型（默认：`anthropic/claude-opus-4`）|
| `WHISPER_API_KEY` | Groq 免费 Whisper 转录 API Key |
| `WHISPER_BASE_URL` | Whisper 接口地址（默认：`https://api.groq.com/openai/v1`）|
| `WHISPER_MODEL` | Whisper 模型（默认：`whisper-large-v3`）|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 登录凭证 |
| `AUTH_SECRET` | NextAuth JWT 密钥（生成：`openssl rand -base64 32`）|
| `NEXTAUTH_URL` | 应用完整 URL（生产环境必填）|

本地开发时将 `.env.example` 复制为 `.env.local`。

## 部署

Docker 多阶段构建 + Nginx 反向代理：
```bash
docker compose up -d
```

生产构建使用 `next.config.ts` 中的 `output: 'standalone'`。Dockerfile 在 runner 阶段安装 `yt-dlp` 和 `ffmpeg`。`docker-compose.yml` 使用 `.env.production` 读取密钥。`nginx/nginx.conf` 中须配置 `proxy_buffering off` 以确保 SSE 正常工作。

## UI 规范

- 所有可见文本和系统提示词均使用简体中文
- Tailwind CSS v4（无需 `tailwind.config` 文件）
- shadcn/ui 组件位于 `components/ui/`，不要修改其中自动生成的文件
- 发送给 OpenRouter 的 `X-Title` 请求头必须为纯 ASCII（不可包含中文字符）
- 图表使用 Recharts；Recharts 的 `percent` 值可能为 `undefined`，需显式标注类型
