'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { consumeStream } from '@/components/shared/StreamingOutput'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Check, BookmarkPlus, Loader2, Trash2, Clock } from 'lucide-react'
import type { SeoAssistantRequest, SeoMode } from '@/app/api/tools/seo-assistant/route'

type SeoIntent = NonNullable<SeoAssistantRequest['intent']>
type SeoTone = NonNullable<SeoAssistantRequest['tone']>

const INTENTS: SeoIntent[] = ['informational', 'commercial', 'transactional', 'navigational']
const TONES: SeoTone[] = ['professional', 'friendly', 'authoritative', 'concise']

const MODE_LABELS: Record<SeoMode, string> = {
  full: '全量方案',
  title: '标题',
  description: '描述',
  keywords: '关键词',
}

export function SeoAssistantTool() {
  const { history, addHistory, removeHistory } = useAppStore()
  const [mode, setMode] = useState<SeoMode>('full')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [keywordSeed, setKeywordSeed] = useState('')
  const [region, setRegion] = useState('中国大陆')
  const [language, setLanguage] = useState('中文')
  const [intent, setIntent] = useState<SeoIntent>('informational')
  const [tone, setTone] = useState<SeoTone>('professional')
  const [output, setOutput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef(false)

  const items = history.filter((h) => h.toolId === 'seo-assistant')

  async function submit() {
    if (!topic.trim() || isStreaming) return
    setOutput('')
    setIsStreaming(true)
    abortRef.current = false

    const body: SeoAssistantRequest = {
      mode,
      topic,
      audience,
      keywordSeed,
      intent,
      tone,
      language,
      region,
    }

    await consumeStream(
      '/api/tools/seo-assistant',
      body,
      (text) => {
        if (!abortRef.current) setOutput((prev) => prev + text)
      },
      () => setIsStreaming(false),
      (err) => {
        setIsStreaming(false)
        toast.error(err)
      },
    )
  }

  function onSave() {
    if (!output) return
    addHistory({
      toolId: 'seo-assistant',
      title: `${MODE_LABELS[mode]} · ${topic.slice(0, 32)}`,
      input: topic,
      output,
    })
    toast.success('已保存到历史记录')
  }

  async function onCopy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 max-w-6xl mx-auto">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>生成模式</Label>
          <Tabs value={mode} onValueChange={(v) => setMode(v as SeoMode)}>
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="full">全量</TabsTrigger>
              <TabsTrigger value="title">标题</TabsTrigger>
              <TabsTrigger value="description">描述</TabsTrigger>
              <TabsTrigger value="keywords">关键词</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-1.5">
          <Label>主题 <span className="text-destructive">*</span></Label>
          <Input
            placeholder="例如：AI 工作流自动化工具"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>目标受众</Label>
          <Input
            placeholder="例如：独立开发者、中小团队运营"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>核心关键词</Label>
          <Input
            placeholder="例如：SEO优化, AI写作, 关键词研究"
            value={keywordSeed}
            onChange={(e) => setKeywordSeed(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>搜索意图</Label>
            <Select value={intent} onValueChange={(v) => setIntent(v as SeoIntent)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTENTS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>语气</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as SeoTone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>语言</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>地区</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
        </div>

        <Button className="w-full" onClick={submit} disabled={isStreaming || !topic.trim()}>
          {isStreaming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />生成中…</> : '生成 SEO 方案'}
        </Button>

        <div className="pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">历史记录</p>
          <ScrollArea className="h-56">
            <div className="space-y-2 pr-1">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">暂无历史记录</p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/40 transition-colors group"
                  onClick={() => {
                    setOutput(item.output)
                    toast.success('已恢复到输出区')
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium truncate flex-1">{item.title}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeHistory(item.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(item.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-h-[520px]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            输出结果
            {isStreaming && <span className="ml-2 text-xs text-primary animate-pulse">生成中…</span>}
            {!isStreaming && output && <span className="ml-2 text-xs text-muted-foreground">{output.length} 字</span>}
          </p>
          {output && !isStreaming && (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onCopy}>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? '已复制' : '复制'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onSave}>
                <BookmarkPlus className="h-3 w-3" />
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setOutput('')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea
          className={cn(
            'flex-1 rounded-lg border bg-muted/30 p-4',
            !output && 'flex items-center justify-center',
          )}
        >
          {output ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {output}
              {isStreaming && (
                <span className="inline-block w-2 h-[1em] bg-foreground animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              )}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8 select-none">SEO 结果将显示在这里</p>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
