import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api-helpers'
import { loadChatbot, readRef } from '@/lib/snakkebot/server'
import { isSpeechToTextConfigured, speechToText, SpeechToTextError } from '@/lib/stt/google'

// Turns the student's recording (16 kHz mono WAV from the browser) into text
// with Google Cloud Speech-to-Text. The recording is not stored.
const MAX_BYTES = 2_500_000 // about 75 seconds of 16 kHz mono

export async function POST(req: Request) {
  const limited = checkRateLimit(req, 30, 60000)
  if (limited) return limited

  const ref = readRef(new URL(req.url))
  if (!ref) return NextResponse.json({ error: 'Ukjent snakkebot.' }, { status: 400 })

  try {
    if (!isSpeechToTextConfigured()) {
      return NextResponse.json({ error: 'Tale til tekst er ikke satt opp.' }, { status: 503 })
    }
    const bot = await loadChatbot(ref)
    if (!bot) return NextResponse.json({ error: 'Fant ikke snakkeboten.' }, { status: 404 })

    const body = Buffer.from(await req.arrayBuffer())
    if (body.length < 44 || body.subarray(0, 4).toString('ascii') !== 'RIFF') {
      return NextResponse.json({ error: 'Ugyldig lydopptak.' }, { status: 400 })
    }
    if (body.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Opptaket er for langt. Snakk kortere om gangen.' }, { status: 413 })
    }

    const text = await speechToText(body)
    return NextResponse.json({ text })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('snakkebot/transkriber:', detail)
    const status = error instanceof SpeechToTextError && error.status === 503 ? 503 : 502
    return NextResponse.json({ error: 'Kunne ikke gjøre talen om til tekst. Prøv igjen.' }, { status })
  }
}
