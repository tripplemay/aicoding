import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createStreamResponse } from '@/lib/claude'

export type VideoAnalysisMode = 'summary' | 'chapters' | 'qa'

export interface VideoAnalyzeRequest {
  transcript: string
  mode: VideoAnalysisMode
  question?: string  // only for 'qa' mode
}

// ─── System prompts ───────────────────────────────────────────────────────────

const SYSTEM_SUMMARY = `你是专业的视频内容分析师。请对视频转录文本进行全面分析，用中文输出结构化摘要。

格式要求（严格遵守）：
**视频主题**
一句话概括视频核心内容

**主要内容**
• 要点1（具体，包含关键信息）
• 要点2
• 要点3（3-6个要点）

**关键信息**
列出重要数据、结论、建议或警示

**总结评价**
2-3句对视频整体价值的评价`

const SYSTEM_CHAPTERS = `你是视频内容结构分析专家。请根据转录文本识别视频内容结构，划分逻辑章节。

格式要求（严格遵守）：
## 第1章：[章节标题]
**时间范围**：[开始时间] - [结束时间]（参考转录中的 [m:ss] 时间戳，如无时间戳则省略此行）
**内容概要**：3-4句话描述本章主要内容

## 第2章：[章节标题]
…以此类推

要求：
• 章节数量 3-8 个
• 标题简洁有力（5-10字）
• 概要具体，体现本章核心价值`

const SYSTEM_QA = `你是视频内容问答助手。用户会提问关于视频内容的问题，请基于以下转录文本准确回答。

规则：
• 只根据转录内容回答，不要凭空捏造
• 如果转录中没有相关信息，直接说明"视频中未提及此内容"
• 回答要具体，可以引用转录中的原文来支撑
• 用中文回答`

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body: VideoAnalyzeRequest = await req.json()

  if (!body.transcript?.trim()) {
    return new Response('Missing transcript', { status: 400 })
  }
  if (body.mode === 'qa' && !body.question?.trim()) {
    return new Response('Missing question for QA mode', { status: 400 })
  }

  const transcriptBlock = `\n\n---\n视频转录内容：\n\n${body.transcript}`

  let system: string
  let userMsg: string

  switch (body.mode) {
    case 'summary':
      system = SYSTEM_SUMMARY
      userMsg = `请对以下视频转录生成摘要：${transcriptBlock}`
      break

    case 'chapters':
      system = SYSTEM_CHAPTERS
      userMsg = `请对以下视频转录划分章节：${transcriptBlock}`
      break

    case 'qa':
      system = SYSTEM_QA + transcriptBlock
      userMsg = body.question!
      break
  }

  return createStreamResponse(
    [{ role: 'user', content: userMsg }],
    system,
    undefined,
    2048,
  )
}
