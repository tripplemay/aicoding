import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { anthropic, DEFAULT_MODEL } from '@/lib/claude'

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  xKey: string
  yKey: string
  data: Record<string, unknown>[]
  xLabel?: string
  yLabel?: string
}

export interface ChartRequest {
  columns: string[]
  sampleRows: Record<string, string>[]
  analysisHint?: string
}

const SYSTEM = `你是数据可视化专家。根据提供的数据，输出一个 JSON 格式的图表配置。

严格按照以下 JSON 格式输出，不要有任何其他文字、代码块标记或解释：
{
  "type": "bar" | "line" | "pie" | "area",
  "title": "简短图表标题",
  "xKey": "x轴使用的列名（原始列名，必须存在于数据中）",
  "yKey": "y轴使用的列名（数值列，必须存在于数据中）",
  "data": [...],
  "xLabel": "x轴说明（可选）",
  "yLabel": "y轴说明（可选）"
}

图表类型选择原则：
• bar：比较不同类别的数值大小
• line：随时间/序列变化的趋势
• area：展示趋势同时强调量级
• pie：各部分占总体比例（此时 data 中用 "name" 和 "value" 两个键）

要求：
• data 数组最多 20 个数据点，取最有代表性的
• 数值字段必须是 number 类型，不能是字符串
• xKey 和 yKey 必须是 data 中实际存在的键名`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body: ChartRequest = await req.json()

  if (!body.columns?.length || !body.sampleRows?.length) {
    return new Response('Missing data', { status: 400 })
  }

  const preview = body.sampleRows
    .slice(0, 30)
    .map((row) => JSON.stringify(row))
    .join('\n')

  const userMsg = [
    `列名：${body.columns.join('、')}`,
    ``,
    `数据样本：`,
    preview,
    body.analysisHint ? `\n分析背景：${body.analysisHint.slice(0, 200)}` : '',
    ``,
    `请为这份数据生成最合适的图表配置 JSON：`,
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const raw =
      response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Strip code fences if Claude added them
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let config: ChartConfig
    try {
      config = JSON.parse(cleaned)
    } catch {
      return new Response('Chart config parse error: ' + cleaned.slice(0, 200), {
        status: 422,
      })
    }

    return Response.json(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(msg, { status: 500 })
  }
}
