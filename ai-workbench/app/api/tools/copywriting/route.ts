import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createStreamResponse } from '@/lib/claude'

export type CopywritingMode = 'generate' | 'polish' | 'rewrite' | 'translate'

export interface CopywritingRequest {
  mode: CopywritingMode
  // generate fields
  type?: string
  topic?: string
  keywords?: string
  style?: string
  length?: string
  // polish / rewrite / translate fields
  content?: string
  targetLang?: string
}

const SYSTEM: Record<CopywritingMode, string> = {
  generate:
    '你是一位专业文案撰写专家，擅长创作各类中文文案。请根据用户需求直接输出高质量文案内容，无需前言或额外解释。',
  polish:
    '你是一位专业文案编辑。请对用户提供的文案进行润色，提升表达流畅性和感染力，保持原意不变。直接输出润色后的完整文案，不要解释改动。',
  rewrite:
    '你是一位资深文案撰写专家。请对用户提供的文案进行改写，保持核心主题但使用全新的表达方式与结构。直接输出改写后的完整文案。',
  translate:
    '你是一位专业翻译专家，精通多种语言。请将用户提供的文案准确翻译，保留原文的语气与风格。直接输出翻译结果。',
}

function buildUserMessage(body: CopywritingRequest): string {
  switch (body.mode) {
    case 'generate':
      return [
        `请撰写一篇「${body.type ?? '通用'}」文案：`,
        `- 主题：${body.topic ?? ''}`,
        body.keywords ? `- 关键词：${body.keywords}` : null,
        `- 写作风格：${body.style ?? '专业'}`,
        `- 目标长度：${body.length ?? '中等（约 500 字）'}`,
      ]
        .filter(Boolean)
        .join('\n')

    case 'polish':
      return `请对以下文案进行润色：\n\n${body.content ?? ''}`

    case 'rewrite':
      return `请对以下文案进行改写：\n\n${body.content ?? ''}`

    case 'translate':
      return `请将以下文案翻译为「${body.targetLang ?? '英文'}」：\n\n${body.content ?? ''}`
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body: CopywritingRequest = await req.json()

  if (!body.mode) {
    return new Response('Missing mode', { status: 400 })
  }
  if (body.mode === 'generate' && !body.topic?.trim()) {
    return new Response('Missing topic', { status: 400 })
  }
  if (['polish', 'rewrite', 'translate'].includes(body.mode) && !body.content?.trim()) {
    return new Response('Missing content', { status: 400 })
  }

  return createStreamResponse(
    [{ role: 'user', content: buildUserMessage(body) }],
    SYSTEM[body.mode],
  )
}
