'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Upload, FileSpreadsheet, BarChart2,
  Copy, Check, Download, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { consumeStream } from '@/components/shared/StreamingOutput'
import { useAppStore } from '@/lib/store'
import type { ChartConfig } from '@/app/api/tools/data-analysis/chart/route'

// ─── Constants ───────────────────────────────────────────────────────────────

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1', '#ec4899']
const MAX_FILE_MB = 10
const SAMPLE_ROWS_FOR_API = 100
const PREVIEW_ROWS = 8

// ─── File Upload Zone ─────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 md:p-10 cursor-pointer transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="rounded-full bg-emerald-500/10 p-4">
        <Upload className="h-7 w-7 text-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">拖拽或点击上传文件</p>
        <p className="text-xs text-muted-foreground mt-1">支持 CSV、Excel (.xlsx / .xls)，最大 {MAX_FILE_MB}MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

// ─── Data Preview Table ───────────────────────────────────────────────────────

function DataPreview({
  columns,
  rows,
  totalRows,
}: {
  columns: string[]
  rows: Record<string, string>[]
  totalRows: number
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? rows.slice(0, 50) : rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium">
            {totalRows.toLocaleString()} 行 · {columns.length} 列
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? '收起' : `展开（前50行）`}
        </Button>
      </div>
      <ScrollArea className="max-h-64">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap border-b">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 whitespace-nowrap text-muted-foreground max-w-[180px] truncate">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Dynamic Chart ────────────────────────────────────────────────────────────

function DynamicChart({ config }: { config: ChartConfig }) {
  if (config.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={config.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {config.data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (config.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={config.data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={config.xKey} tick={{ fontSize: 11 }} label={config.xLabel ? { value: config.xLabel, position: 'insideBottom', offset: -10 } : undefined} />
          <YAxis tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={config.yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (config.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={config.data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={config.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey={config.yKey} stroke={CHART_COLORS[1]} fill={CHART_COLORS[1] + '33'} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={config.data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey={config.xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey={config.yKey} fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DataAnalysisTool() {
  const { addHistory } = useAppStore()

  // File state
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [totalRows, setTotalRows] = useState(0)

  // Analysis state
  const [question, setQuestion] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Chart state
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null)
  const [isGeneratingChart, setIsGeneratingChart] = useState(false)

  // Copy state
  const [copied, setCopied] = useState(false)

  // ── File parsing ──

  const parseFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`文件过大，请上传 ${MAX_FILE_MB}MB 以内的文件`)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    setFileName(file.name)
    setAnalysis('')
    setChartConfig(null)

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const fields = result.meta.fields ?? []
          setColumns(fields)
          setRows(result.data)
          setTotalRows(result.data.length)
          toast.success(`已加载 ${result.data.length.toLocaleString()} 行数据`)
        },
        error: (err) => toast.error('CSV 解析失败：' + err.message),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
          const fields = Object.keys(json[0] ?? {})
          setColumns(fields)
          setRows(json)
          setTotalRows(json.length)
          toast.success(`已加载 ${json.length.toLocaleString()} 行数据`)
        } catch (err) {
          toast.error('Excel 解析失败：' + (err instanceof Error ? err.message : String(err)))
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('不支持的文件格式，请上传 CSV 或 Excel 文件')
    }
  }, [])

  // ── Analyze ──

  async function handleAnalyze() {
    if (isAnalyzing || !question.trim() || !columns.length) return
    setAnalysis('')
    setChartConfig(null)
    setIsAnalyzing(true)

    await consumeStream(
      '/api/tools/data-analysis',
      {
        columns,
        sampleRows: rows.slice(0, SAMPLE_ROWS_FOR_API),
        totalRows,
        question,
      },
      (text) => setAnalysis((prev) => prev + text),
      () => setIsAnalyzing(false),
      (err) => { setIsAnalyzing(false); toast.error(err) },
    )
  }

  // ── Generate Chart ──

  async function handleGenerateChart() {
    if (isGeneratingChart || !columns.length) return
    setIsGeneratingChart(true)
    setChartConfig(null)

    try {
      const res = await fetch('/api/tools/data-analysis/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns,
          sampleRows: rows.slice(0, 30),
          analysisHint: analysis.slice(0, 300),
        }),
      })

      if (!res.ok) {
        toast.error('图表生成失败：' + (await res.text()))
        return
      }

      const config: ChartConfig = await res.json()
      setChartConfig(config)
      toast.success('图表已生成')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '图表生成失败')
    } finally {
      setIsGeneratingChart(false)
    }
  }

  // ── Copy ──

  async function handleCopy() {
    if (!analysis) return
    await navigator.clipboard.writeText(analysis)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Export Markdown report ──

  function handleExport() {
    if (!analysis) return
    const lines = [
      `# 数据分析报告`,
      ``,
      `## 数据概况`,
      `- **文件**：${fileName}`,
      `- **总行数**：${totalRows.toLocaleString()} 行`,
      `- **列名**：${columns.join('、')}`,
      ``,
      `## 分析问题`,
      question,
      ``,
      `## 分析结果`,
      analysis,
      ``,
      `---`,
      `*生成时间：${new Date().toLocaleString('zh-CN')}*`,
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `分析报告_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Save to history ──

  function handleSave() {
    if (!analysis) return
    addHistory({
      toolId: 'data-analysis',
      title: `${fileName} · ${question.slice(0, 30)}`,
      input: question,
      output: analysis,
    })
    toast.success('已保存到历史记录')
  }

  const hasData = columns.length > 0

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">

      {/* ── Upload / File info ── */}
      {!hasData ? (
        <UploadZone onFile={parseFile} />
      ) : (
        <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {totalRows.toLocaleString()} 行 · {columns.length} 列
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive h-8"
            onClick={() => {
              setColumns([]); setRows([]); setTotalRows(0)
              setFileName(''); setAnalysis(''); setChartConfig(null)
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            换文件
          </Button>
        </div>
      )}

      {/* ── Data Preview ── */}
      {hasData && (
        <DataPreview columns={columns} rows={rows} totalRows={totalRows} />
      )}

      {/* ── Main work area ── */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] gap-6">

          {/* Left: Controls */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                提问 <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder={
                  `例如：\n• 各列的数据分布情况如何？\n• 找出数据中的异常值\n• ${columns[0] ?? '列A'} 和 ${columns[1] ?? '列B'} 有什么关联？`
                }
                className="min-h-[160px] resize-none text-sm"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze()
                }}
              />
              <p className="text-xs text-muted-foreground">⌘Enter 快速提交</p>
            </div>

            <Button
              className="w-full"
              disabled={isAnalyzing || !question.trim()}
              onClick={handleAnalyze}
            >
              {isAnalyzing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />分析中…</>
                : '开始分析'}
            </Button>

            {/* Column reference */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">数据列</p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => (
                  <Badge
                    key={col}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-primary/10"
                    onClick={() => setQuestion((q) => q + (q ? ' ' : '') + col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">点击列名可插入到问题中</p>
            </div>
          </div>

          {/* Right: Output */}
          <div className="flex flex-col gap-4">

            {/* Analysis output */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  分析结果
                  {isAnalyzing && (
                    <span className="ml-2 text-xs text-primary animate-pulse">分析中…</span>
                  )}
                </span>
                {analysis && !isAnalyzing && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      {copied ? '已复制' : '复制'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleSave}>
                      保存
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleExport}>
                      <Download className="h-3 w-3" />
                      导出 .md
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="min-h-[200px] max-h-[360px] rounded-lg border bg-muted/30 p-4">
                {analysis ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {analysis}
                    {isAnalyzing && (
                      <span className="inline-block w-2 h-[1em] bg-foreground animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                    )}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10 select-none">
                    提问后分析结果将显示在这里
                  </p>
                )}
              </ScrollArea>
            </div>

            {/* Chart section */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">可视化图表</span>
                  {chartConfig && (
                    <Badge variant="secondary" className="text-xs">{chartConfig.type}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={chartConfig ? 'outline' : 'default'}
                  className="h-7 text-xs"
                  disabled={isGeneratingChart}
                  onClick={handleGenerateChart}
                >
                  {isGeneratingChart
                    ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />生成中…</>
                    : chartConfig ? '重新生成' : '自动生成图表'}
                </Button>
              </div>

              <div className="p-4">
                {chartConfig ? (
                  <div>
                    {chartConfig.title && (
                      <p className="text-sm font-medium text-center mb-4 text-muted-foreground">
                        {chartConfig.title}
                      </p>
                    )}
                    <DynamicChart config={chartConfig} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10 select-none">
                    点击「自动生成图表」，AI 将为数据选择最合适的可视化方式
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
