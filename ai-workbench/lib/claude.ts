import OpenAI from 'openai'

// OpenRouter is OpenAI-API-compatible — just swap baseURL and key
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    'X-Title': 'AI Workbench',
  },
})

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam

export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? 'anthropic/claude-opus-4'

/** Stream a chat response via OpenRouter as SSE */
export function createStreamResponse(
  messages: ChatMessage[],
  system?: string,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
): Response {
  // OpenAI format: system prompt goes as first message with role='system'
  const allMessages: ChatMessage[] = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ]

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openrouter.chat.completions.create({
          model,
          max_tokens: maxTokens,
          messages: allMessages,
          stream: true,
        })

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ text })}\n\n`,
              ),
            )
          }
        }

        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: msg })}\n\n`,
          ),
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
