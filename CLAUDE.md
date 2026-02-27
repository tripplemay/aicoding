# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库结构

这是一个 mono-repo，包含两个独立项目：

| 目录 | 说明 |
|------|------|
| `ai-workbench/` | 主项目——个人 AI 工作台 Next.js 应用（有独立 CLAUDE.md） |
| `test-planning/` | 整个项目的规划文档（task_plan.md / findings.md / progress.md） |

**主项目的所有开发命令、架构说明、环境变量均在 `ai-workbench/CLAUDE.md` 中。**

## 快速启动（ai-workbench）

```bash
cd ai-workbench
npm install
# 复制并填写环境变量（需要 OPENROUTER_API_KEY / ADMIN_USERNAME / ADMIN_PASSWORD / AUTH_SECRET）
cp .env.example .env.local
npm run dev        # localhost:3000
```

## CI/CD

`.github/workflows/deploy.yml` 在 push 到 `main` 分支时自动触发：
1. **build job** — 在 CI 中执行 `npm ci && npm run build`（使用占位环境变量验证构建）
2. **deploy job** — 通过 SSH 连接 VPS，执行 `git pull` → `docker compose down` → `docker compose up --build -d`

所需 GitHub Secrets：`VPS_SSH_KEY`、`VPS_HOST`、`VPS_USER`、`VPS_DEPLOY_PATH`

`cache-dependency-path` 指向 `ai-workbench/package-lock.json`，npm 缓存针对子目录。

## 注意事项

- `.gitignore` 中 `.env.*` 全部被忽略（`.env.example` 除外），本地密钥文件不会提交
- `ai-workbench/` 中 Next.js 16 的中间件文件命名为 `proxy.ts`（非 `middleware.ts`），这是框架版本差异，不要改回
