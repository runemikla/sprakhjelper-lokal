// Speech-to-text with Google Cloud Speech-to-Text, used by Snakkebot.
// Uses the same service account as text-to-speech (GOOGLE_TTS_CREDENTIALS).
// The Speech-to-Text API must be enabled in that Google Cloud project.
// The default v1 API (EU endpoint) needs no extra IAM role. v2 (chirp_3,
// better quality) needs the role «Cloud Speech Client» on the service account.
//
// The browser sends a 16 kHz mono WAV file (LINEAR16), which every model
// accepts. Audio is sent inline (synchronous recognition, under one minute)
// and is not stored by Google or by Språkhjelp.
//
// Environment variables (all optional):
//   GOOGLE_STT_VERSION   v1 (default) or v2
//   GOOGLE_STT_LOCATION  v2 location, default eu (EU multi-region)
//   GOOGLE_STT_MODEL     v2: default chirp_3. v1: Google's default model.
//   GOOGLE_STT_LANGUAGE  default no-NO (Norwegian Bokmål)
//   GOOGLE_STT_PROJECT   project id, default the project of the service account

import { getServiceAccountProjectId, getServiceAccountToken } from '@/lib/tts/google-auth'

export class SpeechToTextError extends Error {
  readonly status: number
  // Short Norwegian explanation that is safe to show in the app.
  readonly userMessage: string
  constructor(message: string, status: number, userMessage?: string) {
    super(message)
    this.name = 'SpeechToTextError'
    this.status = status
    this.userMessage = userMessage ?? 'Kunne ikke gjøre talen om til tekst. Prøv igjen.'
  }
}

// Turns Google's error into a message a teacher can act on.
function explain(status: number, message: string, version: string): string {
  if (/SERVICE_DISABLED|has not been used|is disabled/i.test(message)) {
    return 'Tale til tekst er ikke slått på. Slå på «Cloud Speech-to-Text API» i Google Cloud-prosjektet.'
  }
  if (status === 403 || /PERMISSION_DENIED/i.test(message)) {
    return version === 'v2'
      ? 'Tjenestekontoen har ikke tilgang til tale til tekst. Gi den rollen «Cloud Speech Client», eller fjern GOOGLE_STT_VERSION=v2.'
      : 'Tjenestekontoen har ikke tilgang til tale til tekst i Google Cloud. Sjekk at Cloud Speech-to-Text API er slått på, og at fakturering er aktiv.'
  }
  if (status === 401) return 'Innloggingen mot Google Cloud feilet. Sjekk GOOGLE_TTS_CREDENTIALS.'
  if (status === 429) return 'For mange forespørsler til tale til tekst akkurat nå. Vent litt og prøv igjen.'
  if (status === 400) return 'Google kunne ikke lese opptaket. Prøv igjen, eller skriv svaret.'
  return 'Kunne ikke gjøre talen om til tekst. Prøv igjen.'
}

function settings() {
  return {
    version: process.env.GOOGLE_STT_VERSION?.trim().toLowerCase() === 'v2' ? 'v2' : 'v1',
    location: process.env.GOOGLE_STT_LOCATION?.trim() || 'eu',
    model: process.env.GOOGLE_STT_MODEL?.trim() || '',
    language: process.env.GOOGLE_STT_LANGUAGE?.trim() || 'no-NO',
    project: process.env.GOOGLE_STT_PROJECT?.trim() || getServiceAccountProjectId() || '',
  }
}

export function isSpeechToTextConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TTS_CREDENTIALS?.trim())
}

interface RecognizeResponse {
  results?: { alternatives?: { transcript?: string }[] }[]
  error?: { message?: string }
}

function joinTranscript(data: RecognizeResponse): string {
  return (data.results ?? [])
    .map((r) => r.alternatives?.[0]?.transcript?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Transcribes a short WAV recording of Norwegian speech. */
export async function speechToText(wav: Buffer): Promise<string> {
  const token = await getServiceAccountToken()
  if (!token) {
    throw new SpeechToTextError(
      'Tale til tekst er ikke satt opp (GOOGLE_TTS_CREDENTIALS mangler).',
      503,
      'Tale til tekst er ikke satt opp. Du kan skrive svaret i stedet.'
    )
  }
  const s = settings()
  const content = wav.toString('base64')

  let url: string
  let body: unknown
  if (s.version === 'v1') {
    // v1 has an EU endpoint too; the WAV header gives encoding and rate.
    url = 'https://eu-speech.googleapis.com/v1/speech:recognize'
    body = {
      config: {
        languageCode: s.language,
        enableAutomaticPunctuation: true,
        ...(s.model ? { model: s.model } : {}),
      },
      audio: { content },
    }
  } else {
    if (!s.project) {
      throw new SpeechToTextError(
        'Fant ikke Google Cloud-prosjektet (sett GOOGLE_STT_PROJECT).',
        503,
        'Tale til tekst er ikke satt opp riktig (mangler prosjekt).'
      )
    }
    const host = s.location === 'global' ? 'speech.googleapis.com' : `${s.location}-speech.googleapis.com`
    url = `https://${host}/v2/projects/${encodeURIComponent(s.project)}/locations/${encodeURIComponent(s.location)}/recognizers/_:recognize`
    body = {
      config: {
        autoDecodingConfig: {},
        model: s.model || 'chirp_3',
        languageCodes: [s.language],
      },
      content,
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as RecognizeResponse

  if (!response.ok) {
    const detail = JSON.stringify(data.error ?? {}).slice(0, 600)
    throw new SpeechToTextError(
      `Google tale til tekst (${s.version}) svarte ${response.status}: ${detail}`,
      response.status === 429 ? 429 : 502,
      explain(response.status, detail, s.version)
    )
  }
  return joinTranscript(data)
}
