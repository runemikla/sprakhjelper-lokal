import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { chatbotReply, isChatModelConfigured, loadChatbot, readRef } from '@/lib/snakkebot/server'
import { LIMITS } from '@/lib/snakkebot/types'

// The chatbot's next answer. The browser keeps the conversation and sends it
// with every request; nothing is stored on the server.
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
    const reply = await chatbotReply(bot, messages)
    return NextResponse.json({ reply })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    console.error('snakkebot/svar:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Snakkeboten kunne ikke svare. Prøv igjen.' }, { status: 502 })
  }
}
