import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api-helpers'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { googleTextToSpeech } from '@/lib/tts/google'
import { TextToSpeechError } from '@/lib/tts/errors'
import { isValidVoiceId, SAMPLE_TEXT } from '@/lib/tts/voices'

// The sample «Hei! Velkommen til Språkhjelp!» in one voice, for the admin page
// /admin/stemmer. Each standard sample is made once per server process and
// kept in memory, and the browser keeps it for a week, so browsing the voices
// again costs nothing at Google.
//
// The admin can also write their own sentence (?text=…). Those samples are
// not kept on the server, and the browser keeps them for an hour.

const samples = new Map<string, Buffer>()
const MAX_TEXT = 300

export async function GET(req: Request) {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) {
    return NextResponse.json({ error: 'Bare administratorer har tilgang.' }, { status: 403 })
  }

  const voice = new URL(req.url).searchParams.get('voice')
  if (!isValidVoiceId(voice)) {
    return NextResponse.json({ error: 'Ukjent stemme.' }, { status: 400 })
  }

  const ownText = (new URL(req.url).searchParams.get('text') ?? '').trim()
  if (ownText.length > MAX_TEXT) {
    return NextResponse.json({ error: `Teksten kan ha maks ${MAX_TEXT} tegn.` }, { status: 400 })
  }
  const isStandard = ownText === '' || ownText === SAMPLE_TEXT

  let audio = isStandard ? samples.get(voice) : undefined
  if (!audio) {
    const limited = checkRateLimit(req, 120, 60000)
    if (limited) return limited
    try {
      audio = await googleTextToSpeech(isStandard ? SAMPLE_TEXT : ownText, 1, voice)
      if (isStandard) samples.set(voice, audio)
    } catch (error) {
      const message =
        error instanceof TextToSpeechError
          ? error.message
          : `Kunne ikke lage lydprøven: ${error instanceof Error ? error.message : String(error)}`
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': isStandard ? 'private, max-age=604800, immutable' : 'private, max-age=3600',
    },
  })
}
