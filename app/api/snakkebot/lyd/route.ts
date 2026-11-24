import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { chatbotSpeech, loadChatbot, readRef } from '@/lib/snakkebot/server'

// Reads one of the chatbot's answers aloud with the chatbot's voice.
const schema = z.object({ text: z.string().trim().min(1).max(2000) })

export async function POST(req: Request) {
  const limited = checkRateLimit(req, 40, 60000)
  if (limited) return limited

  const ref = readRef(new URL(req.url))
  if (!ref) return NextResponse.json({ error: 'Ukjent snakkebot.' }, { status: 400 })

  try {
    const { text } = schema.parse(await req.json())
    const bot = await loadChatbot(ref)
    if (!bot) return NextResponse.json({ error: 'Fant ikke snakkeboten.' }, { status: 404 })
    const { audio, mimeType } = await chatbotSpeech(bot, text)
    return new NextResponse(new Uint8Array(audio), {
      headers: { 'Content-Type': mimeType, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    console.error('snakkebot/lyd:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Kunne ikke lese opp svaret.' }, { status: 502 })
  }
}
