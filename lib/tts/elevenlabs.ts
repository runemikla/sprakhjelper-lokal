import { TextToSpeechError } from './errors'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = 'k5IgYJw2jfo6mO5HhagG'
const ELEVENLABS_MODEL_ID = 'eleven_flash_v2_5'
// ElevenLabs accepts speed between 0.7 and 1.2.
const MIN_SPEED = 0.7
const MAX_SPEED = 1.2

/**
 * Convert text to MP3 speech with ElevenLabs.
 * The API key stays on the server and is never sent to the browser.
 */
export async function elevenLabsTextToSpeech(
  text: string,
  speakingRate: number
): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error(
      'ElevenLabs configuration missing. Please set ELEVENLABS_API_KEY in .env'
    )
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speakingRate)),
        },
      }),
    }
  )

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const errorBody = (await response.json()) as {
        detail?: { message?: string; code?: string }
      }
      detail = errorBody.detail?.message ?? detail
    } catch {
      // Keep the status text when the error body is not JSON.
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('ElevenLabs error status:', response.status, detail)
    }

    if (response.status === 402) {
      throw new TextToSpeechError(
        'Denne stemmen krever en betalt ElevenLabs-plan. Oppgrader abonnementet eller velg en annen stemme.',
        402
      )
    }

    throw new TextToSpeechError(
      'Kunne ikke lage lyd av teksten. Prøv igjen.',
      response.status
    )
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  if (audioBuffer.byteLength === 0) {
    throw new Error('Empty audio response from ElevenLabs')
  }

  return audioBuffer
}
