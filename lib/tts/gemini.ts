// Text-to-speech with Gemini voices. Used by the word lists in «Lær ord»,
// whose built-in themes were also recorded with these voices.
//
// Two ways to reach the Gemini voices:
//
// 1. Google Cloud Text-to-Speech on the EU endpoint (default when the
//    service account in GOOGLE_TTS_CREDENTIALS is set). Text and audio stay
//    inside Europe. The service account needs the role «Vertex AI User»
//    (roles/aiplatform.user) in addition to Cloud Text-to-Speech.
// 2. The Gemini API (generativelanguage.googleapis.com) with GEMINI_API_KEY.
//    Only used when there is no service account. It has no EU guarantee.
//
// Environment variables:
//   GOOGLE_TTS_CREDENTIALS  service account (shared with Cloud TTS and Speech-to-Text)
//   GOOGLE_TTS_ENDPOINT     defaults to https://eu-texttospeech.googleapis.com
//   GEMINI_TTS_EU_MODEL     Cloud TTS model, defaults to gemini-2.5-flash-tts
//                           (the newest Gemini voice model on the EU endpoint)
//   GEMINI_API_KEY          only for way 2 (GOOGLE_API_KEY works too)
//   GEMINI_TTS_MODEL        only for way 2, defaults to gemini-3.1-flash-tts-preview

import { TextToSpeechError } from './errors'
import { DEFAULT_GEMINI_VOICE, isGeminiVoice } from './gemini-voices'
import { getServiceAccountToken } from './google-auth'
import { googleTtsEndpoint } from './google'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const SAMPLE_RATE = 24000
const FALLBACK_MODEL = 'gemini-2.5-flash-preview-tts'
const DEFAULT_STYLE = 'Say slowly and clearly, in Norwegian Bokmål'

function config() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '',
    model: process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.1-flash-tts-preview',
    cloudModel: process.env.GEMINI_TTS_EU_MODEL?.trim() || 'gemini-2.5-flash-tts',
    hasServiceAccount: Boolean(process.env.GOOGLE_TTS_CREDENTIALS?.trim()),
  }
}

export function isGeminiTtsConfigured(): boolean {
  const c = config()
  return c.hasServiceAccount || Boolean(c.apiKey)
}

// Raw 16-bit mono PCM needs a WAV header to be playable.
function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function asWav(data: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  return data.subarray(0, 4).toString('ascii') === 'RIFF' ? data : pcmToWav(data, sampleRate)
}

// Way 1: Cloud Text-to-Speech (EU endpoint by default).
async function cloudTextToSpeech(
  token: string,
  model: string,
  text: string,
  voiceName: string,
  style: string
): Promise<Buffer> {
  const response = await fetch(`${googleTtsEndpoint()}/v1/text:synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      input: { prompt: style, text },
      voice: { languageCode: 'nb-NO', name: voiceName, modelName: model },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE },
    }),
  })

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? detail
    } catch {
      // Keep the status text when the error body is not JSON.
    }
    console.error('Gemini-lyd (Cloud TTS) error:', response.status, detail)
    const hint = response.status === 403
      ? ' Tjenestekontoen trenger rollen «Vertex AI User» (roles/aiplatform.user) i Google Cloud.'
      : ''
    throw new TextToSpeechError(
      `Kunne ikke lage lyd av teksten. Google svarte: ${detail}.${hint}`,
      response.status === 429 ? 429 : 502
    )
  }

  const data = (await response.json()) as { audioContent?: string }
  if (!data.audioContent) {
    throw new TextToSpeechError('Google sendte ikke noe lyd.', 502)
  }
  return asWav(Buffer.from(data.audioContent, 'base64'))
}

// Way 2: the Gemini API (no EU guarantee).
async function geminiApiRequest(model: string, apiKey: string, text: string, voiceName: string, style: string) {
  return fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      // The older TTS models take a short style instruction before the text.
      contents: [{ parts: [{ text: `${style}: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  })
}

async function geminiApiTextToSpeech(
  apiKey: string,
  model: string,
  text: string,
  voiceName: string,
  style: string
): Promise<Buffer> {
  let response = await geminiApiRequest(model, apiKey, text, voiceName, style)
  if (response.status === 404 && model !== FALLBACK_MODEL) {
    response = await geminiApiRequest(FALLBACK_MODEL, apiKey, text, voiceName, style)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new TextToSpeechError(
      `Gemini-lyd svarte ${response.status}: ${detail.slice(0, 300)}`,
      response.status === 429 ? 429 : 502
    )
  }

  const payload = await response.json()
  const parts = (payload.candidates?.[0]?.content?.parts ?? []) as {
    inlineData?: { data?: string; mimeType?: string }
  }[]
  const audio = parts.find((p) => p.inlineData?.data)?.inlineData
  if (!audio?.data) {
    throw new TextToSpeechError('Gemini sendte ikke noe lyd.', 502)
  }
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? '')?.[1]) || SAMPLE_RATE
  return asWav(Buffer.from(audio.data, 'base64'), rate)
}

/** Reads Norwegian text aloud and returns a WAV file. */
export async function geminiTextToSpeech(
  text: string,
  voice: string = DEFAULT_GEMINI_VOICE,
  // Short English style instruction, without a colon.
  style: string = DEFAULT_STYLE
): Promise<Buffer> {
  const { apiKey, model, cloudModel } = config()
  const voiceName = isGeminiVoice(voice) ? voice : DEFAULT_GEMINI_VOICE

  const token = await getServiceAccountToken()
  if (token) return cloudTextToSpeech(token, cloudModel, text, voiceName, style)

  if (!apiKey) {
    throw new TextToSpeechError(
      'Gemini-lyd er ikke satt opp (GOOGLE_TTS_CREDENTIALS eller GEMINI_API_KEY mangler).',
      503
    )
  }
  console.warn('Gemini-lyd bruker Gemini API uten EU-garanti fordi GOOGLE_TTS_CREDENTIALS mangler.')
  return geminiApiTextToSpeech(apiKey, model, text, voiceName, style)
}
