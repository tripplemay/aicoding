import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const DEFAULT_MODEL = 'claude-opus-4-6'

/** Stream Claude response as a ReadableStream for SSE */
export function createStreamResponse(
  messages: Anthropic.MessageParam[],
  system?: string,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model,
          max_tokens: maxTokens,
          system,
          messages,
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            controller.enqueue(new TextEncoder().encode(data))
          }
        }

        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
