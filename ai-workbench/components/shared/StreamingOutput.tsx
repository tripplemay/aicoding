'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface StreamingOutputProps {
  content: string
  isStreaming?: boolean
  className?: string
  minHeight?: string
}

/** Renders streaming text with auto-scroll to bottom */
export function StreamingOutput({
  content,
  isStreaming = false,
  className,
  minHeight = 'min-h-[200px]',
}: StreamingOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [content, isStreaming])

  return (
    <ScrollArea className={cn('rounded-md border bg-muted/30 p-4', minHeight, className)}>
      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
        {content}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5 align-text-bottom" />
        )}
      </pre>
      <div ref={bottomRef} />
    </ScrollArea>
  )
}

/** Helper to consume an SSE stream from our API routes */
export async function consumeStream(
  url: string,
  body: unknown,
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (msg: string) => void,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const text = await res.text()
    onError?.(text || 'Request failed')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') {
        onDone?.()
        return
      }
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          onError?.(parsed.error)
          return
        }
        if (parsed.text) {
          onChunk(parsed.text)
        }
      } catch {
        // ignore malformed lines
      }
    }
  }

  onDone?.()
}
