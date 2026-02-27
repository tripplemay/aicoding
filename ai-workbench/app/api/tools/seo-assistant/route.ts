import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createStreamResponse } from '@/lib/claude'

export type SeoMode = 'full' | 'title' | 'description' | 'keywords'

export interface SeoAssistantRequest {
  mode: SeoMode
  topic: string
  audience?: string
  keywordSeed?: string
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational'
  tone?: 'professional' | 'friendly' | 'authoritative' | 'concise'
  language?: string
  region?: string
}

const SYSTEM_PROMPTS: Record<SeoMode, string> = {
  full:
    '你是一名资深 SEO 策略师。根据用户输入输出可直接使用的 SEO 方案，使用简洁中文，不要解释推理过程。',
  title:
    '你是一名 SEO 标题优化专家。请输出高点击潜力、符合搜索意图且自然包含关键词的标题建议。',
  description:
    '你是一名 SEO Meta Description 专家。请输出可直接粘贴使用的高转化描述文案。',
  keywords:
    '你是一名 SEO 关键词研究专家。请输出按搜索意图组织的关键词清单与优先级建议。',
}

function buildUserMessage(body: SeoAssistantRequest): string {
  return [
    `任务模式：${body.mode}`,
    `主题：${body.topic}`,
    `目标受众：${body.audience || '通用用户'}`,
    `核心关键词：${body.keywordSeed || '未提供'}`,
    `搜索意图：${body.intent || 'informational'}`,
    `语气：${body.tone || 'professional'}`,
    `语言：${body.language || '中文'}`,
    `地区：${body.region || '中国大陆'}`,
    '',
    '输出要求：',
    body.mode === 'title'
      ? '- 给出 12 个标题，按推荐度排序；每条尽量控制在 30 字内。'
      : null,
    body.mode === 'description'
      ? '- 给出 6 条 meta description；每条 70-150 字，包含 CTA。'
      : null,
    body.mode === 'keywords'
      ? '- 输出主关键词、长尾关键词、问题型关键词、竞品替代词，并标注优先级。'
      : null,
    body.mode === 'full'
      ? '- 依次输出：标题建议（12 条）、Meta Description（6 条）、关键词策略（分组+优先级）、内容大纲（H1/H2/H3）。'
      : null,
    '- 仅输出结果，不要额外寒暄。',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body: SeoAssistantRequest = await req.json()
  if (!body.topic?.trim()) {
    return new Response('Missing topic', { status: 400 })
  }
  if (!body.mode) {
    return new Response('Missing mode', { status: 400 })
  }

  return createStreamResponse(
    [{ role: 'user', content: buildUserMessage(body) }],
    SYSTEM_PROMPTS[body.mode],
  )
}
