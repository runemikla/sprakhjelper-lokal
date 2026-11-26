// Norwegian voices from Google Cloud Text-to-Speech, and the ones the admin has
// made available in the AI tools (page /stemmer, table tts_voices).
//
// A voice is stored in the tools by its «voice id»:
// - Chirp 3 HD voices by their short name, such as «Erinome». That is how the
//   tools have always stored them, and the same names exist as Gemini voices.
// - every other voice by its full Google name, such as «nb-NO-Wavenet-A».
//
// This file has no server code, so the voice pickers in the browser use it too.

import { CHOSEN_VOICES, DEFAULT_CHOSEN_VOICE, GEMINI_VOICES } from './gemini-voices'

export type VoiceGender = 'kvinne' | 'mann' | 'nøytral'

export interface TtsVoice {
  // What the tools store and send, see above.
  id: string
  // The voice's full name at Google, such as «nb-NO-Chirp3-HD-Erinome».
  googleName: string
  // Voice family, such as «Chirp3-HD» or «Wavenet».
  type: string
  gender: VoiceGender | null
  // Short description; only Chirp 3 HD voices have one.
  style: string | null
}

export const SAMPLE_TEXT = 'Hei! Velkommen til Språkhjelp!'

const CHIRP3 = 'Chirp3-HD'
const SHORT_ID = /^[A-Z][a-z]{1,19}$/
const FULL_NAME = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/

// Readable names for the voice families, in the order they are listed.
export const VOICE_TYPE_LABELS: Record<string, string> = {
  'Chirp3-HD': 'Chirp 3 HD',
  'Chirp-HD': 'Chirp HD',
  Studio: 'Studio',
  Neural2: 'Neural2',
  Wavenet: 'WaveNet',
  Polyglot: 'Polyglot',
  Standard: 'Standard',
}

export function voiceTypeLabel(type: string): string {
  return VOICE_TYPE_LABELS[type] ?? type
}

export function voiceTypeOrder(type: string): number {
  const index = Object.keys(VOICE_TYPE_LABELS).indexOf(type)
  return index === -1 ? 99 : index
}

/** «nb-NO-Wavenet-A» → «Wavenet»; «nb-NO-Chirp3-HD-Erinome» → «Chirp3-HD». */
export function voiceTypeOf(googleName: string): string {
  const parts = googleName.split('-')
  return parts.slice(2, -1).join('-') || 'Ukjent'
}

/** The id the tools store for a Google voice name. */
export function voiceIdOf(googleName: string): string {
  const parts = googleName.split('-')
  if (voiceTypeOf(googleName) === CHIRP3 && googleName.startsWith('nb-NO-')) {
    return parts[parts.length - 1]
  }
  return googleName
}

/** The Google voice name for an id the tools stored. */
export function googleNameOf(voiceId: string): string {
  return SHORT_ID.test(voiceId) ? `nb-NO-${CHIRP3}-${voiceId}` : voiceId
}

/** True for ids that can be stored and sent to Google. */
export function isValidVoiceId(voiceId: string | null | undefined): voiceId is string {
  if (!voiceId || voiceId.length > 40) return false
  return SHORT_ID.test(voiceId) || FULL_NAME.test(voiceId)
}

export function genderFromGoogle(ssmlGender: string | null | undefined): VoiceGender | null {
  if (ssmlGender === 'FEMALE') return 'kvinne'
  if (ssmlGender === 'MALE') return 'mann'
  if (ssmlGender === 'NEUTRAL') return 'nøytral'
  return null
}

/** Builds the description of a voice from its Google name. */
export function describeVoice(googleName: string, gender: VoiceGender | null = null): TtsVoice {
  const id = voiceIdOf(googleName)
  const type = voiceTypeOf(googleName)
  const gemini = type === CHIRP3 ? GEMINI_VOICES.find((v) => v.name === id) : undefined
  return {
    id,
    googleName,
    type,
    gender: gender ?? gemini?.gender ?? null,
    style: gemini?.style ?? null,
  }
}

/** The voice's own name: «Erinome», or «A» for «nb-NO-Wavenet-A». */
export function voiceShortName(voice: TtsVoice): string {
  const parts = voice.googleName.split('-')
  return parts[parts.length - 1]
}

/** «Erinome (kvinne, klar)» or «WaveNet A (kvinne)». */
export function ttsVoiceLabel(voice: TtsVoice): string {
  const name = voice.type === CHIRP3 ? voiceShortName(voice) : `${voiceTypeLabel(voice.type)} ${voiceShortName(voice)}`
  const details = [voice.gender, voice.style].filter(Boolean).join(', ')
  return details ? `${name} (${details})` : name
}

/** The four voices the tools offered before the admin page existed. */
export const DEFAULT_AVAILABLE_VOICES: TtsVoice[] = CHOSEN_VOICES.map((v) =>
  describeVoice(googleNameOf(v.name))
)

/** The voice new content gets: Erinome when available, otherwise the first one. */
export function defaultVoiceOf(voices: TtsVoice[]): string {
  if (voices.some((v) => v.id === DEFAULT_CHOSEN_VOICE)) return DEFAULT_CHOSEN_VOICE
  return voices[0]?.id ?? DEFAULT_CHOSEN_VOICE
}

/** Sorts voices by family, then name. */
export function sortVoices(voices: TtsVoice[]): TtsVoice[] {
  return [...voices].sort(
    (a, b) =>
      voiceTypeOrder(a.type) - voiceTypeOrder(b.type) ||
      a.type.localeCompare(b.type) ||
      voiceShortName(a).localeCompare(voiceShortName(b))
  )
}
