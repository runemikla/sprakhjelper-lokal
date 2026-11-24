import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { ChatModelError, ContentFilterError, chatbotReplyStream, isChatModelConfigured, loadChatbot, readRef } from '@/lib/snakkebot/server'
import { LIMITS } from '@/lib/snakkebot/types'

// The chatbot's next answer. The browser keeps the conversation and sends it
// with every request; nothing is stored on the server.
//
// The answer is streamed as NDJSON while the model writes it:
//   {"d":"text"}                      a piece of the answer
//   {"done":true,"ms":{...}}          the end, with timings in milliseconds
//   {"error":"..."}                   the model failed halfway
// Errors before the first piece come back as an ordinary JSON error
// (422 with "filtered": true when the content filter stopped the turn).
const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(LIMITS.message),
      })
    )
    .max(200),
})

export async function POST(req: Request) {
  const limited = checkRateLimit(req, 30, 60000)
  if (limited) return limited

  const ref = readRef(new URL(req.url))
  if (!ref) return NextResponse.json({ error: 'Ukjent snakkebot.' }, { status: 400 })

  try {
    const { messages } = schema.parse(await req.json())
    const bot = await loadChatbot(ref)
    if (!bot) return NextResponse.json({ error: 'Fant ikke snakkeboten.' }, { status: 404 })
    if (!isChatModelConfigured()) {
      return NextResponse.json({ error: 'Språkmodellen er ikke satt opp.' }, { status: 503 })
    }
    const started = Date.now()
    const pieces = chatbotReplyStream(bot, messages)
    // Wait for the first piece, so setup errors become a normal error response.
    const first = await pieces.next()
    const firstMs = Date.now() - started
    const encoder = new TextEncoder()
    const line = (value: unknown) => encoder.encode(JSON.stringify(value) + '\n')

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done) controller.enqueue(line({ d: first.value }))
          for await (const piece of { [Symbol.asyncIterator]: () => pieces }) controller.enqueue(line({ d: piece }))
          controller.enqueue(line({ done: true, ms: { first: firstMs, total: Date.now() - started } }))
        } catch (error) {
          console.error('snakkebot/svar (strøm):', error instanceof Error ? error.message : error)
          controller.enqueue(line({ error: 'Snakkeboten ble avbrutt. Prøv igjen.' }))
        } finally {
          controller.close()
        }
      },
      cancel() {
        void pieces.return(undefined)
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    if (error instanceof ContentFilterError) {
      console.warn('snakkebot/svar:', error.message)
      return NextResponse.json(
        { error: 'Det ble litt feil. Kan du si det på nytt, kanskje med litt andre ord?', filtered: true },
        { status: 422 }
      )
    }
    const detail = error instanceof Error ? error.message : String(error)
    console.error('snakkebot/svar:', detail)
    // Admins see what went wrong, so they can fix the setup.
    if (await isAdmin(await getUser().catch(() => null)).catch(() => false)) {
      const hint = error instanceof ChatModelError ? error.hint : 'Ukjent feil.'
      return NextResponse.json({ error: `Snakkeboten kunne ikke svare. ${hint} Detaljer: ${detail}` }, { status: 502 })
    }
    return NextResponse.json({ error: 'Snakkeboten kunne ikke svare. Prøv igjen.' }, { status: 502 })
  }
}
