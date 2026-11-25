import { TextToSpeechError } from './errors'
import { getServiceAccountToken } from './google-auth'
import { googleNameOf } from './voices'

// The EU endpoint keeps the text and the audio inside Europe. Set
// GOOGLE_TTS_ENDPOINT to use another endpoint.
const DEFAULT_ENDPOINT = 'https://eu-texttospeech.googleapis.com'

/** The Cloud Text-to-Speech endpoint, without a trailing slash. */
export function googleTtsEndpoint(): string {
  return (process.env.GOOGLE_TTS_ENDPOINT?.trim() || DEFAULT_ENDPOINT).replace(/\/+$/, '')
}
const DEFAULT_VOICE = 'nb-NO-Chirp3-HD-Leda'

/**
 * Convert text to MP3 speech with Google Cloud Text-to-Speech.
 * Uses the service account in GOOGLE_TTS_CREDENTIALS when set, otherwise
 * GOOGLE_TTS_API_KEY. Credentials stay on the server.
 */
export async function googleTextToSpeech(
  text: string,
  speakingRate: number,
  // Voice id (see lib/tts/voices.ts): a Chirp 3 HD name such as «Erinome»,
  // or a full Google name such as «nb-NO-Wavenet-A». Without it,
  // GOOGLE_TTS_VOICE or the default voice is used.
  voice?: string
): Promise<Buffer> {
  const accessToken = await getServiceAccountToken()
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!accessToken && !apiKey) {
    throw new Error(
      'Google TTS configuration missing. Please set GOOGLE_TTS_CREDENTIALS or GOOGLE_TTS_API_KEY in .env'
    )
  }

  const endpoint = googleTtsEndpoint()
  const voiceName = voice
    ? googleNameOf(voice)
    : process.env.GOOGLE_TTS_VOICE || DEFAULT_VOICE
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
