import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createStreamResponse } from '@/lib/claude'

export interface DataAnalysisRequest {
  columns: string[]
  sampleRows: Record<string, string>[]
  totalRows: number
  question: string
}

const SYSTEM = `你是一位专业数据分析师，精通数据分析与统计。用户会提供数据集的列名和样本数据，请根据问题给出深入分析。

规则：
- 用中文回答
- 给出具体数字和百分比，不要泛泛而谈
- 指出趋势、异常点、关键发现
- 使用清晰的段落和要点（用 • 符号）
- 如果问题是开放性探索，主动给出 3-5 条关键洞察`

function buildPrompt(req: DataAnalysisRequest): string {
  const sampleSize = Math.min(req.sampleRows.length, 50)
  const dataLines = req.sampleRows.slice(0, sampleSize).map((row) =>
    req.columns.map((col) => `${col}: ${row[col] ?? ''}`).join(' | '),
  )

  return [
    `数据集概况：`,
    `- 总行数：${req.totalRows} 行`,
    `- 列数：${req.columns.length} 列`,
    `- 列名：${req.columns.join('、')}`,
    ``,
    `数据样本（前 ${sampleSize} 行）：`,
    ...dataLines,
    ``,
    `问题：${req.question}`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body: DataAnalysisRequest = await req.json()

  if (!body.columns?.length || !body.question?.trim()) {
    return new Response('Missing required fields', { status: 400 })
  }

  return createStreamResponse(
    [{ role: 'user', content: buildPrompt(body) }],
    SYSTEM,
    undefined,
    2048,
  )
}
