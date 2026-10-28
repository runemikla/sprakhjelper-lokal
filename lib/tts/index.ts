import { elevenLabsTextToSpeech } from './elevenlabs'
import { googleTextToSpeech } from './google'
import { DEFAULT_SPEAKING_RATE } from '@/lib/lytteoving'

export { TextToSpeechError } from './errors'

/**
 * Convert text to MP3 speech. Google Cloud TTS is the default; set
 * TTS_PROVIDER=elevenlabs to use ElevenLabs instead.
 */
export async function textToSpeech(
  text: string,
  speakingRate: number = DEFAULT_SPEAKING_RATE
): Promise<Buffer> {
  if (process.env.TTS_PROVIDER?.toLowerCase() === 'elevenlabs') {
    return elevenLabsTextToSpeech(text, speakingRate)
  }
  return googleTextToSpeech(text, speakingRate)
}
