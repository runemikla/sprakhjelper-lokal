import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { textToSpeech, TextToSpeechError } from '@/lib/tts'
import { DEFAULT_CHOSEN_VOICE } from '@/lib/tts/gemini-voices'
import { isValidVoiceId } from '@/lib/tts/voices'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Reads a word or an example sentence aloud for a teacher's list with Google
// Cloud Text-to-Speech (Chirp 3 HD) on the EU endpoint, so text and audio stay
// in Europe. Any voice id from lib/tts/voices.ts works.
const schema = z.object({
  text: z.string().trim().min(1).max(200),
  voice: z.string().trim().max(40).optional(),
  // Sent by older clients; every voice is Google Cloud (Chirp 3 HD) now.
  provider: z.enum(['gemini', 'google']).optional(),
})

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 240, 60000)
  if (limited) return limited

  try {
    const { text, voice } = schema.parse(await req.json())
    const audio = await textToSpeech(text, 0.9, isValidVoiceId(voice) ? voice : DEFAULT_CHOSEN_VOICE)
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
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
