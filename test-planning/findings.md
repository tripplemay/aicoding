# Findings & Decisions

## Requirements

### 核心需求
- 个人 AI 工作台，单用户使用
- 集成多种 AI 工具，统一入口
- 三大初始工具：文案撰写、数据分析、视频分析
- 支持后续按需扩展新工具，改动成本低

### 功能需求
- 文案撰写：多种文案类型、风格控制、流式输出、历史保存
- 数据分析：文件上传、自然语言查询、图表生成、报告导出
- 视频分析：上传/URL、转录、摘要、问答
- 全局：历史会话、工具切换、响应式布局

### 非功能需求
- 可扩展性：插件化架构，新工具低成本接入
- 性能：流式响应、懒加载
- 简洁：无过度工程，个人项目聚焦实用

---

## Technical Architecture

### 目录结构设计

```
ai-workbench/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 全局布局（侧边栏 + 主区域）
│   ├── page.tsx                  # Dashboard 首页
│   ├── tools/
│   │   ├── [toolId]/
│   │   │   └── page.tsx          # 动态工具页（通过 registry 渲染）
│   └── api/
│       ├── chat/route.ts         # 通用 Claude 流式对话
│       ├── tools/
│       │   ├── copywriting/route.ts
│       │   ├── data-analysis/route.ts
│       │   └── video-analysis/route.ts
│       └── upload/route.ts       # 文件上传处理
├── lib/
│   ├── tool-registry.ts          # 工具注册表（核心扩展点）
│   ├── claude.ts                 # Claude API 封装
│   └── store.ts                  # Zustand 全局状态
├── tools/                        # 每个工具的独立模块
│   ├── copywriting/
│   │   ├── manifest.ts           # 工具元数据
│   │   ├── component.tsx         # 工具 UI
│   │   └── api.ts                # 工具 API 调用逻辑
│   ├── data-analysis/
│   │   ├── manifest.ts
│   │   ├── component.tsx
│   │   └── api.ts
│   └── video-analysis/
│       ├── manifest.ts
│       ├── component.tsx
│       └── api.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ToolContainer.tsx
│   ├── shared/
│   │   ├── FileUpload.tsx
│   │   ├── StreamingOutput.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── MarkdownRenderer.tsx
│   └── ui/                       # shadcn/ui 组件
└── types/
    └── tool.ts                   # Tool 类型定义
```

### Tool Registry 模式（核心扩展机制）

```typescript
// types/tool.ts
interface ToolManifest {
  id: string
  name: string
  description: string
  icon: string             // Lucide icon name
  category: 'writing' | 'analysis' | 'media' | 'custom'
  tags: string[]
  component: React.ComponentType
  enabled: boolean
  route: string            // /tools/{id}
}

// lib/tool-registry.ts
import { copywritingTool } from '@/tools/copywriting/manifest'
import { dataAnalysisTool } from '@/tools/data-analysis/manifest'
import { videoAnalysisTool } from '@/tools/video-analysis/manifest'

export const TOOL_REGISTRY: ToolManifest[] = [
  copywritingTool,
  dataAnalysisTool,
  videoAnalysisTool,
  // 新增工具: 只需在此添加一行
]
```

**添加新工具只需 3 步：**
1. 在 `tools/` 下创建新文件夹（含 manifest.ts + component.tsx）
2. 在 `TOOL_REGISTRY` 中添加一行
3. （可选）在 `app/api/tools/` 添加 API 路由

---

## Tool Design Details

### 文案撰写工具
- **输入**：类型选择（Blog/社交/邮件/广告）、主题、关键词、风格（正式/轻松/专业）、目标长度
- **输出**：流式 Markdown 渲染
- **额外功能**：一键润色/改写/翻译选中文本
- **历史**：localStorage 保存最近 20 条

### 数据分析工具
- **输入**：CSV/Excel 上传（解析为 JSON）+ 自然语言问题
- **输出**：文字分析 + Recharts 图表（自动选择柱状/折线/饼图）
- **额外功能**：导出 Markdown 报告
- **限制**：文件大小 < 10MB，行数 < 50,000

### 视频分析工具
- **输入**：YouTube URL 或 B站 URL（纯 URL，无文件上传）
- **流程**：
  1. 尝试 `youtube-transcript` 直接获取字幕（快，免费）
  2. 无字幕时：`yt-dlp`（VPS 上安装）提取音频 → OpenAI Whisper API 转录
- **输出**：带时间戳摘要、章节划分、关键点列表
- **问答**：基于转录内容的对话模式
- **VPS 前提**：需在 VPS 上安装 `yt-dlp`（`pip install yt-dlp`）

---

## API Integration

### Claude API 封装
```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 流式响应工具函数
export async function streamMessage(messages, system?) {
  return claude.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system,
    messages,
  })
}
```

### 视频转录（Whisper）
- 方案 A：OpenAI Whisper API（最简单）
- 方案 B：本地 Whisper（隐私更好，需 Python 服务）
- 初版用方案 A，可后续替换

---

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| NextAuth.js v5 + Credentials | 无需数据库，用户名/密码存 .env，中间件统一保护所有路由 |
| Docker multi-stage build | builder 层编译，runner 层精简，镜像体积小，含 yt-dlp |
| Nginx proxy_buffering off | 保证 Claude 流式响应（SSE）在反向代理后正常工作 |
| youtube-transcript 优先 | 字幕比 Whisper 转录快 10x，成本为零，作为快速路径 |
| yt-dlp 装进 Docker 镜像 | 视频音频提取依赖系统工具，Alpine + pip 安装 |
| Next.js App Router | 动态路由 `/tools/[toolId]` 天然支持工具注册 |
| Tool Registry 中心注册 | 新工具=一个文件夹+一行注册，核心代码不变 |
| Zustand 而非 Redux | 无样板，小型个人项目足够 |
| Recharts 图表库 | React 原生，文档好，定制容易 |
| shadcn/ui 组件 | 可复制粘贴，无黑箱依赖，自由定制 |
| localStorage 历史 | 无需后端，快速启动，个人使用够用 |
| Streaming first | 用 ReadableStream 包装 Claude 流式响应，UX 更好 |
| Papaparse (CSV解析) | 浏览器端 CSV 解析，无需后端处理 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| — | — |

## Auth Architecture

### NextAuth.js v5 (Auth.js) — Credentials Provider
```typescript
// auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize(credentials) {
        if (
          credentials.username === process.env.ADMIN_USERNAME &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: '1', name: 'Admin' }
        }
        return null
      },
    }),
  ],
  pages: { signIn: '/login' },
})

// middleware.ts — 保护所有路由
export { auth as middleware } from '@/auth'
export const config = { matcher: ['/((?!login|_next|api/auth).*)'] }
```

**环境变量：**
```
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_secure_password
AUTH_SECRET=random_32char_string   # openssl rand -base64 32
```

---

## Deployment Architecture (VPS)

### 文件结构
```
ai-workbench/
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf
│   └── ssl/                  # Let's Encrypt 证书挂载点
├── .env.production           # 不提交，VPS 手动创建
└── ...app files
```

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 py3-pip && pip3 install yt-dlp
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
services:
  app:
    build: .
    env_file: .env.production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped
```

### Nginx 配置要点
- HTTP → HTTPS 重定向
- HTTPS → 反向代理到 app:3000
- 流式响应：`proxy_buffering off`（关键！保证 SSE 正常）

### SSL 初始化（VPS 上执行一次）
```bash
apt install certbot
certbot certonly --standalone -d yourdomain.com
# 之后 docker-compose up -d
```

---

## 视频处理技术方案

### 流程图
```
URL 输入
  │
  ├─ YouTube URL？
  │     ├─ 尝试 youtube-transcript（有字幕）→ 直接返回文字
  │     └─ 无字幕 → yt-dlp 下载音频 → Whisper API → 返回文字
  │
  └─ B站 URL？
        └─ yt-dlp 下载音频 → Whisper API → 返回文字

转录文字 → Claude 分析 → 摘要 + 章节 + 关键点
```

### API 路由设计
```
POST /api/tools/video-analysis/transcript
  body: { url: string }
  → { transcript: string, source: 'caption' | 'whisper' }

POST /api/tools/video-analysis/analyze
  body: { transcript: string, question?: string }
  → SSE stream（Claude 流式响应）
```

---

## Resources
- Anthropic SDK: `@anthropic-ai/sdk`
- Next.js 15 App Router docs
- shadcn/ui: `npx shadcn@latest init`
- Recharts: `recharts`
- Papaparse: `papaparse` (CSV 解析)
- xlsx: `xlsx` (Excel 解析)
- Zustand: `zustand`
- Lucide icons: `lucide-react`
- OpenAI SDK (Whisper): `openai`
- NextAuth.js v5: `next-auth@beta`
- youtube-transcript: `youtube-transcript`（YouTube 字幕提取）
- yt-dlp: VPS 系统安装（`pip install yt-dlp`）

## Visual/Browser Findings
- 参考产品：Dify.ai（工具集成模式）、ChatGPT（流式对话）、Notion AI（内嵌工具）
- 设计风格目标：深色/浅色主题切换，左侧工具导航栏，右侧主内容区，顶部工具标题栏
