import { TextToSpeechError } from './errors'
import { getServiceAccountToken } from './google-auth'

const DEFAULT_ENDPOINT = 'https://texttospeech.googleapis.com'
const DEFAULT_VOICE = 'nb-NO-Chirp3-HD-Leda'

/**
 * Convert text to MP3 speech with Google Cloud Text-to-Speech.
 * Uses the service account in GOOGLE_TTS_CREDENTIALS when set, otherwise
 * GOOGLE_TTS_API_KEY. Credentials stay on the server.
 */
export async function googleTextToSpeech(
  text: string,
  speakingRate: number
): Promise<Buffer> {
  const accessToken = await getServiceAccountToken()
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!accessToken && !apiKey) {
    throw new Error(
      'Google TTS configuration missing. Please set GOOGLE_TTS_CREDENTIALS or GOOGLE_TTS_API_KEY in .env'
    )
  }

  const endpoint = (process.env.GOOGLE_TTS_ENDPOINT || DEFAULT_ENDPOINT).replace(
    /\/+$/,
    ''
  )
  const voiceName = process.env.GOOGLE_TTS_VOICE || DEFAULT_VOICE
  // Voice names look like "nb-NO-Chirp3-HD-Leda"; the first two parts are the language.
  const languageCode = voiceName.split('-').slice(0, 2).join('-')

  const response = await fetch(`${endpoint}/v1/text:synthesize`, {
    method: 'POST',
    headers: {
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : { 'X-Goog-Api-Key': apiKey as string }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate },
    }),
  })

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const errorBody = (await response.json()) as {
        error?: { message?: string }
      }
      detail = errorBody.error?.message ?? detail
    } catch {
      // Keep the status text when the error body is not JSON.
    }

    // Logged in production too, so the reason shows up in the server logs.
    console.error('Google TTS error:', response.status, detail)

    // Only teachers can generate audio, so the provider's reason is shown to help
    // fix setup problems such as a disabled API, missing billing or a wrong voice.
    throw new TextToSpeechError(
      `Kunne ikke lage lyd av teksten. Google svarte: ${detail}`,
      response.status
    )
  }

  const data = (await response.json()) as { audioContent?: string }
  if (!data.audioContent) {
    throw new Error('Empty audio response from Google TTS')
  }

  return Buffer.from(data.audioContent, 'base64')
}
