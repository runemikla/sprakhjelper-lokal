import { getServiceAccountToken } from './google-auth'
import { googleTtsEndpoint } from './google'
import { describeVoice, genderFromGoogle, sortVoices, type TtsVoice } from './voices'

// All Norwegian voices Google Cloud Text-to-Speech has (voices.list), for the
// admin page /stemmer. Kept for an hour, since Google seldom adds voices.

const LANGUAGE = 'nb-NO'
const CACHE_TTL_MS = 60 * 60 * 1000
let cache: { voices: TtsVoice[]; expiresAt: number } | null = null

interface GoogleVoice {
  name?: string
  languageCodes?: string[]
  ssmlGender?: string
}

export async function listGoogleVoices(): Promise<TtsVoice[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.voices

  const accessToken = await getServiceAccountToken()
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!accessToken && !apiKey) {
    throw new Error('GOOGLE_TTS_CREDENTIALS mangler i miljøvariablene.')
  }

  const response = await fetch(`${googleTtsEndpoint()}/v1/voices?languageCode=${LANGUAGE}`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : { 'X-Goog-Api-Key': apiKey as string },
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    const detail = body?.error?.message ?? `${response.status} ${response.statusText}`
    console.error('Google voices.list error:', response.status, detail)
    throw new Error(`Google svarte: ${detail}`)
  }

  const data = (await response.json()) as { voices?: GoogleVoice[] }
  const voices = sortVoices(
    (data.voices ?? [])
      .filter((v): v is GoogleVoice & { name: string } =>
        Boolean(v.name?.startsWith(`${LANGUAGE}-`)) && (v.languageCodes ?? [LANGUAGE]).includes(LANGUAGE)
      )
      .map((v) => describeVoice(v.name, genderFromGoogle(v.ssmlGender)))
  )
  cache = { voices, expiresAt: Date.now() + CACHE_TTL_MS }
  return voices
}
