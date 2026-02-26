'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Loader2, Link2, Copy, Check, BookmarkPlus,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { consumeStream } from '@/components/shared/StreamingOutput'
import { useAppStore } from '@/lib/store'
import type { VideoAnalysisMode } from '@/app/api/tools/video-analysis/analyze/route'
import type { TranscriptResponse } from '@/app/api/tools/video-analysis/transcript/route'

// ─── Platform detection ───────────────────────────────────────────────────────

type Platform = 'youtube' | 'bilibili' | 'other'

function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili'
  return 'other'
}

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  bilibili: 'B站',
  other: '视频链接',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: 'bg-red-500/10 text-red-500',
  bilibili: 'bg-blue-500/10 text-blue-400',
  other: 'bg-muted text-muted-foreground',
}

// ─── Transcript Panel ─────────────────────────────────────────────────────────

function TranscriptPanel({
  transcript,
  source,
  truncated,
}: {
  transcript: string
  source: 'caption' | 'whisper'
  truncated: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const charCount = transcript.length
  const preview = expanded ? transcript : transcript.slice(0, 600)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium">字幕 / 转录文本</span>
          <Badge
            variant="secondary"
            className={cn('text-xs', source === 'caption' ? 'text-emerald-600' : 'text-amber-600')}
          >
            {source === 'caption' ? '原始字幕' : 'Whisper 转录'}
          </Badge>
          <span className="text-xs text-muted-foreground">{charCount.toLocaleString()} 字符</span>
          {truncated && (
            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
              已截断（超 15,000 字）
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? '收起' : '展开'}
        </Button>
      </div>
      <div className="px-4 py-3">
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-mono">
          {preview}
          {!expanded && transcript.length > 600 && (
            <span className="text-primary cursor-pointer" onClick={() => setExpanded(true)}>
              {' '}…展开查看全文
            </span>
          )}
        </pre>
      </div>
    </div>
  )
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({
  output,
  isStreaming,
  onSave,
  onClear,
  toolLabel,
}: {
  output: string
  isStreaming: boolean
  onSave: () => void
  onClear: () => void
  toolLabel: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between min-h-[28px]">
        <span className="text-sm font-medium text-muted-foreground">
          {toolLabel}
          {isStreaming && (
            <span className="ml-2 text-xs text-primary animate-pulse">生成中…</span>
          )}
        </span>
        {output && !isStreaming && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onSave}>
              <BookmarkPlus className="h-3 w-3" />
              保存
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-[220px] max-h-[480px] rounded-xl border bg-muted/30 p-4">
        {output ? (
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
            {output}
            {isStreaming && (
              <span className="inline-block w-2 h-[1em] bg-foreground animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            )}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12 select-none">
            结果将显示在这里
          </p>
        )}
      </ScrollArea>

      {output && !isStreaming && (
        <button
          className="text-xs text-muted-foreground hover:text-destructive text-right"
          onClick={onClear}
        >
          清空
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoAnalysisTool() {
  const { addHistory } = useAppStore()

  // URL & transcript state
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<Platform>('other')
  const [isExtracting, setIsExtracting] = useState(false)
  const [transcriptData, setTranscriptData] = useState<TranscriptResponse | null>(null)

  // Analysis state
  const [mode, setMode] = useState<VideoAnalysisMode>('summary')
  const [question, setQuestion] = useState('')
  const [output, setOutput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // ── Extract transcript ──

  async function handleExtract() {
    if (isExtracting || !url.trim()) return
    setIsExtracting(true)
    setTranscriptData(null)
    setOutput('')

    try {
      const res = await fetch('/api/tools/video-analysis/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!res.ok) {
        const errMsg = await res.text()
        toast.error(errMsg, { duration: 8000 })
        return
      }

      const data: TranscriptResponse = await res.json()
      setTranscriptData(data)

      if (data.truncated) {
        toast.warning('转录文本超过 15,000 字，已截断以控制成本')
      } else {
        toast.success(
          data.source === 'caption'
            ? '字幕提取成功（原始字幕）'
            : 'Whisper 转录完成',
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  // ── Analyze ──

  async function handleAnalyze(overrideMode?: VideoAnalysisMode) {
    if (isAnalyzing || !transcriptData) return
    const activeMode = overrideMode ?? mode
    if (activeMode === 'qa' && !question.trim()) {
      toast.error('请输入问题')
      return
    }

    setOutput('')
    setIsAnalyzing(true)

    await consumeStream(
      '/api/tools/video-analysis/analyze',
      {
        transcript: transcriptData.transcript,
        mode: activeMode,
        question: activeMode === 'qa' ? question : undefined,
      },
      (text) => setOutput((prev) => prev + text),
      () => setIsAnalyzing(false),
      (err) => { setIsAnalyzing(false); toast.error(err) },
    )
  }

  // ── Save ──

  function handleSave() {
    if (!output || !transcriptData) return
    const modeLabel = { summary: '摘要', chapters: '章节', qa: '问答' }[mode]
    addHistory({
      toolId: 'video-analysis',
      title: `${modeLabel} · ${url.slice(-40)}`,
      input: mode === 'qa' ? question : url,
      output,
    })
    toast.success('已保存到历史记录')
  }

  const hasTranscript = !!transcriptData

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* ── URL Input ── */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-rose-500" />
          <span className="font-medium text-sm">输入视频链接</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            {url && (
              <Badge
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5',
                  PLATFORM_COLORS[platform],
                )}
              >
                {PLATFORM_LABELS[platform]}
              </Badge>
            )}
            <Input
              placeholder="https://www.youtube.com/watch?v=... 或 https://www.bilibili.com/video/BV..."
              className={cn('pr-3', url && 'pl-20')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setPlatform(detectPlatform(e.target.value))
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExtract() }}
            />
          </div>
          <Button
            className="shrink-0"
            disabled={isExtracting || !url.trim()}
            onClick={handleExtract}
          >
            {isExtracting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />提取中…</>
            ) : (
              '提取字幕'
            )}
          </Button>
          {hasTranscript && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 text-muted-foreground"
              onClick={() => { setTranscriptData(null); setOutput('') }}
              title="更换视频"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Strategy hint */}
        {!hasTranscript && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              YouTube 视频优先提取原始字幕（快速）；无字幕或 B站视频则通过 yt-dlp + Whisper 转录（需服务器安装 yt-dlp & ffmpeg，约 1-3 分钟）
            </p>
          </div>
        )}

        {/* Extracting progress */}
        {isExtracting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
            <span>
              {platform === 'youtube'
                ? '尝试提取 YouTube 字幕，若无字幕将启动 Whisper 转录…'
                : '使用 yt-dlp 下载音频，Whisper 转录中（约 1-3 分钟）…'}
            </span>
          </div>
        )}
      </div>

      {/* ── Transcript preview ── */}
      {hasTranscript && (
        <TranscriptPanel
          transcript={transcriptData!.transcript}
          source={transcriptData!.source}
          truncated={transcriptData!.truncated}
        />
      )}

      {/* ── Analysis section ── */}
      {hasTranscript && (
        <Tabs
          value={mode}
          onValueChange={(v) => { setMode(v as VideoAnalysisMode); setOutput('') }}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="summary" className="flex-1 sm:flex-none">📝 摘要</TabsTrigger>
            <TabsTrigger value="chapters" className="flex-1 sm:flex-none">📑 章节划分</TabsTrigger>
            <TabsTrigger value="qa" className="flex-1 sm:flex-none">💬 问答</TabsTrigger>
          </TabsList>

          {/* Summary */}
          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                生成结构化视频摘要，包含主题、要点、关键信息和总体评价
              </p>
              <Button
                disabled={isAnalyzing}
                onClick={() => handleAnalyze('summary')}
                className="shrink-0"
              >
                {isAnalyzing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />生成中…</>
                  : '生成摘要'}
              </Button>
            </div>
            <OutputPanel
              output={output}
              isStreaming={isAnalyzing}
              onSave={handleSave}
              onClear={() => setOutput('')}
              toolLabel="视频摘要"
            />
          </TabsContent>

          {/* Chapters */}
          <TabsContent value="chapters" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                根据内容结构自动划分章节，标注时间范围与核心内容
              </p>
              <Button
                disabled={isAnalyzing}
                onClick={() => handleAnalyze('chapters')}
                className="shrink-0"
              >
                {isAnalyzing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />划分中…</>
                  : '划分章节'}
              </Button>
            </div>
            <OutputPanel
              output={output}
              isStreaming={isAnalyzing}
              onSave={handleSave}
              onClear={() => setOutput('')}
              toolLabel="章节结构"
            />
          </TabsContent>

          {/* Q&A */}
          <TabsContent value="qa" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="例如：视频的核心观点是什么？ / 作者对 XX 问题的看法是？ / 第几分钟讲到了 XX？"
                className="min-h-[80px] resize-none text-sm flex-1"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze('qa')
                }}
              />
              <Button
                disabled={isAnalyzing || !question.trim()}
                onClick={() => handleAnalyze('qa')}
                className="self-end shrink-0"
              >
                {isAnalyzing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />回答中…</>
                  : '提问'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">⌘Enter 快速提交 · 可连续提问，每次独立回答</p>
            <OutputPanel
              output={output}
              isStreaming={isAnalyzing}
              onSave={handleSave}
              onClear={() => setOutput('')}
              toolLabel="问答结果"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
