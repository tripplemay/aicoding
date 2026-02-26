'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Copy, Check, BookmarkPlus, Trash2, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { consumeStream } from '@/components/shared/StreamingOutput'
import { useAppStore } from '@/lib/store'
import type { CopywritingMode, CopywritingRequest } from '@/app/api/tools/copywriting/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: '博客文章', label: '博客文章' },
  { value: '社交媒体帖子', label: '社交媒体帖子' },
  { value: '邮件正文', label: '邮件正文' },
  { value: '广告文案', label: '广告文案' },
  { value: '产品描述', label: '产品描述' },
  { value: '演讲稿', label: '演讲稿' },
]

const STYLES = [
  { value: '专业正式', label: '专业正式' },
  { value: '轻松活泼', label: '轻松活泼' },
  { value: '幽默风趣', label: '幽默风趣' },
  { value: '感性温暖', label: '感性温暖' },
  { value: '简洁有力', label: '简洁有力' },
]

const LENGTHS = [
  { value: '短文（约 200 字）', label: '短文（~200 字）' },
  { value: '中等（约 500 字）', label: '中等（~500 字）' },
  { value: '长文（约 1000 字）', label: '长文（~1000 字）' },
]

const LANGUAGES = [
  { value: '英文', label: '英文' },
  { value: '日文', label: '日文' },
  { value: '法文', label: '法文' },
  { value: '德文', label: '德文' },
  { value: '西班牙文', label: '西班牙文' },
  { value: '韩文', label: '韩文' },
]

const MODE_LABELS: Record<CopywritingMode, string> = {
  generate: '生成',
  polish: '润色',
  rewrite: '改写',
  translate: '翻译',
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({
  output,
  isStreaming,
  onSave,
  onClear,
}: {
  output: string
  isStreaming: boolean
  onSave: () => void
  onClear: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-[400px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          输出结果
          {isStreaming && (
            <span className="ml-2 text-xs text-primary animate-pulse">生成中…</span>
          )}
          {!isStreaming && output && (
            <span className="ml-2 text-xs text-muted-foreground">{output.length} 字</span>
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
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onClear}
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
          <p className="text-sm text-muted-foreground text-center py-8 select-none">
            输出结果将显示在这里
          </p>
        )}
      </ScrollArea>
    </div>
  )
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ onRestore }: { onRestore: (text: string) => void }) {
  const { history, removeHistory } = useAppStore()
  const items = history.filter((h) => h.toolId === 'copywriting')

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">暂无历史记录</p>
    )
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2 pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/40 transition-colors group"
            onClick={() => onRestore(item.output)}
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
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.output.slice(0, 80)}…</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {new Date(item.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CopywritingTool() {
  const { addHistory } = useAppStore()

  // Shared output state
  const [output, setOutput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(false)

  // Generate form state
  const [genType, setGenType] = useState('博客文章')
  const [genTopic, setGenTopic] = useState('')
  const [genKeywords, setGenKeywords] = useState('')
  const [genStyle, setGenStyle] = useState('专业正式')
  const [genLength, setGenLength] = useState('中等（约 500 字）')

  // Polish / Rewrite / Translate shared
  const [inputContent, setInputContent] = useState('')
  const [targetLang, setTargetLang] = useState('英文')

  // Current active mode (for save label)
  const currentModeRef = useRef<CopywritingMode>('generate')

  async function submit(body: CopywritingRequest) {
    if (isStreaming) return
    setOutput('')
    setIsStreaming(true)
    abortRef.current = false

    await consumeStream(
      '/api/tools/copywriting',
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

  function handleSave() {
    if (!output) return
    const mode = currentModeRef.current
    const title =
      mode === 'generate'
        ? `${MODE_LABELS[mode]} · ${genType} · ${genTopic.slice(0, 20)}`
        : `${MODE_LABELS[mode]} · ${inputContent.slice(0, 30)}`
    addHistory({ toolId: 'copywriting', title, input: '', output })
    toast.success('已保存到历史记录')
  }

  function handleRestore(text: string) {
    setOutput(text)
    toast.success('已恢复到输出区')
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <Tabs
        defaultValue="generate"
        onValueChange={(v) => { currentModeRef.current = v as CopywritingMode }}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="generate">✍️ 生成</TabsTrigger>
            <TabsTrigger value="polish">✨ 润色</TabsTrigger>
            <TabsTrigger value="rewrite">🔄 改写</TabsTrigger>
            <TabsTrigger value="translate">🌐 翻译</TabsTrigger>
          </TabsList>
          <div className="flex gap-1.5">
            {Object.entries(MODE_LABELS).map(([k, v]) => (
              <Badge key={k} variant="outline" className="text-xs hidden" aria-hidden />
            ))}
          </div>
        </div>

        {/* ── Generate ── */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>文案类型</Label>
                <Select value={genType} onValueChange={setGenType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>主题 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="例如：介绍我们新推出的 AI 效率工具"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  关键词
                  <span className="text-xs text-muted-foreground font-normal">（可选，逗号分隔）</span>
                </Label>
                <Input
                  placeholder="例如：高效、智能、一站式"
                  value={genKeywords}
                  onChange={(e) => setGenKeywords(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>写作风格</Label>
                  <Select value={genStyle} onValueChange={setGenStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>目标长度</Label>
                  <Select value={genLength} onValueChange={setGenLength}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LENGTHS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={isStreaming || !genTopic.trim()}
                onClick={() =>
                  submit({
                    mode: 'generate',
                    type: genType,
                    topic: genTopic,
                    keywords: genKeywords,
                    style: genStyle,
                    length: genLength,
                  })
                }
              >
                {isStreaming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />生成中…</>
                ) : (
                  '生成文案'
                )}
              </Button>

              {/* History */}
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">历史记录</p>
                <HistoryPanel onRestore={handleRestore} />
              </div>
            </div>

            {/* Output */}
            <OutputPanel
              output={output}
              isStreaming={isStreaming}
              onSave={handleSave}
              onClear={() => setOutput('')}
            />
          </div>
        </TabsContent>

        {/* ── Polish ── */}
        <TabsContent value="polish" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>待润色文案 <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="粘贴需要润色的文案内容…"
                  className="min-h-[240px] resize-none"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={isStreaming || !inputContent.trim()}
                onClick={() => submit({ mode: 'polish', content: inputContent })}
              >
                {isStreaming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />润色中…</>
                ) : (
                  '✨ 开始润色'
                )}
              </Button>
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">历史记录</p>
                <HistoryPanel onRestore={handleRestore} />
              </div>
            </div>
            <OutputPanel
              output={output}
              isStreaming={isStreaming}
              onSave={handleSave}
              onClear={() => setOutput('')}
            />
          </div>
        </TabsContent>

        {/* ── Rewrite ── */}
        <TabsContent value="rewrite" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>待改写文案 <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="粘贴需要改写的文案内容…"
                  className="min-h-[240px] resize-none"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={isStreaming || !inputContent.trim()}
                onClick={() => submit({ mode: 'rewrite', content: inputContent })}
              >
                {isStreaming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />改写中…</>
                ) : (
                  '🔄 开始改写'
                )}
              </Button>
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">历史记录</p>
                <HistoryPanel onRestore={handleRestore} />
              </div>
            </div>
            <OutputPanel
              output={output}
              isStreaming={isStreaming}
              onSave={handleSave}
              onClear={() => setOutput('')}
            />
          </div>
        </TabsContent>

        {/* ── Translate ── */}
        <TabsContent value="translate" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>待翻译文案 <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="粘贴需要翻译的文案内容…"
                  className="min-h-[200px] resize-none"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>目标语言</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={isStreaming || !inputContent.trim()}
                onClick={() =>
                  submit({ mode: 'translate', content: inputContent, targetLang })
                }
              >
                {isStreaming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />翻译中…</>
                ) : (
                  '🌐 开始翻译'
                )}
              </Button>
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">历史记录</p>
                <HistoryPanel onRestore={handleRestore} />
              </div>
            </div>
            <OutputPanel
              output={output}
              isStreaming={isStreaming}
              onSave={handleSave}
              onClear={() => setOutput('')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
