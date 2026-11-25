import { NextResponse } from 'next/server'
import { getAvailableVoices } from '@/lib/tts/available-voices'
import { defaultVoiceOf } from '@/lib/tts/voices'

// The voices teachers can choose between in the AI tools, for the voice
// pickers. Chosen by the admin on /stemmer.
export const dynamic = 'force-dynamic'

export async function GET() {
  const voices = await getAvailableVoices()
  return NextResponse.json(
    { voices, defaultVoice: defaultVoiceOf(voices) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
