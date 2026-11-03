// Text-to-speech with Gemini (the same Gemini API key as the pictures).
// Used by the word lists in «Lær ord», whose built-in themes were also
// recorded with Gemini.
//
// Environment variables:
//   GEMINI_API_KEY    API key from Google AI Studio (GOOGLE_API_KEY works too)
//   GEMINI_TTS_MODEL  defaults to gemini-3.1-flash-tts-preview. Uses the
//                     generateContent format of the 2.5/3.1 TTS models;
//                     falls back to gemini-2.5-flash-preview-tts on 404.

import { TextToSpeechError } from './errors'
import { DEFAULT_GEMINI_VOICE, isGeminiVoice } from './gemini-voices'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const SAMPLE_RATE = 24000

function config() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '',
    model: process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.1-flash-tts-preview',
  }
}

export function isGeminiTtsConfigured(): boolean {
  return Boolean(config().apiKey)
}

// Gemini returns raw 16-bit mono PCM. A WAV header makes it playable.
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

const FALLBACK_MODEL = 'gemini-2.5-flash-preview-tts'

async function request(model: string, apiKey: string, text: string, voiceName: string) {
  return fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      // The older TTS models take a short style instruction before the text.
      contents: [{ parts: [{ text: `Say slowly and clearly, in Norwegian Bokmål: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  })
}

/** Reads Norwegian text aloud and returns a WAV file. */
export async function geminiTextToSpeech(text: string, voice: string = DEFAULT_GEMINI_VOICE): Promise<Buffer> {
  const { apiKey, model } = config()
  if (!apiKey) {
    throw new TextToSpeechError('Gemini-lyd er ikke satt opp (GEMINI_API_KEY mangler).', 503)
  }
  const voiceName = isGeminiVoice(voice) ? voice : DEFAULT_GEMINI_VOICE

  let response = await request(model, apiKey, text, voiceName)
  if (response.status === 404 && model !== FALLBACK_MODEL) {
    response = await request(FALLBACK_MODEL, apiKey, text, voiceName)
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
  const data = Buffer.from(audio.data, 'base64')
  // Newer models already send WAV; older ones send raw PCM.
  if (data.subarray(0, 4).toString('ascii') === 'RIFF') return data
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? '')?.[1]) || SAMPLE_RATE
  return pcmToWav(data, rate)
}
