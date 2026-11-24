import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { ChatModelError, ContentFilterError, chatbotReply, isChatModelConfigured, loadChatbot, readRef } from '@/lib/snakkebot/server'
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
