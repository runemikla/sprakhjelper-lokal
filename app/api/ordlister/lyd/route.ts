import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { textToSpeech, TextToSpeechError } from '@/lib/tts'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Reads a word or an example sentence aloud (MP3) for a teacher's list.
const schema = z.object({ text: z.string().trim().min(1).max(200) })

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 120, 60000)
  if (limited) return limited

  try {
    const { text } = schema.parse(await req.json())
    const audio = await textToSpeech(text, 0.9)
    return new NextResponse(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    console.error('ordlister/lyd:', error instanceof Error ? error.message : error)
    const message =
      error instanceof TextToSpeechError ? error.message : 'Kunne ikke lage lyd.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
