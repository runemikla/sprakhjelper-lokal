import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { textToSpeech, TextToSpeechError } from '@/lib/tts'
import { geminiTextToSpeech, isGeminiTtsConfigured } from '@/lib/tts/gemini'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Reads a word or an example sentence aloud for a teacher's list. Uses Gemini
// (same as the built-in «Lær ord» recordings) when GEMINI_API_KEY is set,
// otherwise Google Cloud Text-to-Speech.
const schema = z.object({
  text: z.string().trim().min(1).max(200),
  voice: z.string().trim().max(40).optional(),
})

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 240, 60000)
  if (limited) return limited

  try {
    const { text, voice } = schema.parse(await req.json())
    const gemini = isGeminiTtsConfigured()
    const audio = gemini ? await geminiTextToSpeech(text, voice) : await textToSpeech(text, 0.9)
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': gemini ? 'audio/wav' : 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    const detail = error instanceof Error ? error.message : String(error)
    console.error('ordlister/lyd:', detail)
    // Only teachers reach this route, so the real reason is shown to help fix
    // setup problems (missing credentials, disabled API, wrong voice).
    const message =
      error instanceof TextToSpeechError ? error.message : `Kunne ikke lage lyd: ${detail}`
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
