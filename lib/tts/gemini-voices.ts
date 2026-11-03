// The prebuilt voices of Gemini text-to-speech. Shared by the server route
// and the voice picker in the word list editor.

export interface GeminiVoice {
  name: string
  // Google's one-word description of the voice, in Norwegian.
  style: string
  gender: 'kvinne' | 'mann'
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { name: 'Kore', style: 'bestemt', gender: 'kvinne' },
  { name: 'Leda', style: 'ungdommelig', gender: 'kvinne' },
  { name: 'Aoede', style: 'luftig', gender: 'kvinne' },
  { name: 'Zephyr', style: 'lys', gender: 'kvinne' },
  { name: 'Autonoe', style: 'lys', gender: 'kvinne' },
  { name: 'Callirrhoe', style: 'avslappet', gender: 'kvinne' },
  { name: 'Despina', style: 'myk', gender: 'kvinne' },
  { name: 'Erinome', style: 'klar', gender: 'kvinne' },
  { name: 'Laomedeia', style: 'positiv', gender: 'kvinne' },
  { name: 'Achernar', style: 'mild', gender: 'kvinne' },
  { name: 'Gacrux', style: 'moden', gender: 'kvinne' },
  { name: 'Pulcherrima', style: 'fremoverlent', gender: 'kvinne' },
  { name: 'Vindemiatrix', style: 'vennlig og rolig', gender: 'kvinne' },
  { name: 'Sulafat', style: 'varm', gender: 'kvinne' },
  { name: 'Puck', style: 'positiv', gender: 'mann' },
  { name: 'Charon', style: 'informativ', gender: 'mann' },
  { name: 'Fenrir', style: 'engasjert', gender: 'mann' },
  { name: 'Orus', style: 'bestemt', gender: 'mann' },
  { name: 'Enceladus', style: 'pustende', gender: 'mann' },
  { name: 'Iapetus', style: 'klar', gender: 'mann' },
  { name: 'Umbriel', style: 'avslappet', gender: 'mann' },
  { name: 'Algieba', style: 'myk', gender: 'mann' },
  { name: 'Algenib', style: 'ru', gender: 'mann' },
  { name: 'Rasalgethi', style: 'informativ', gender: 'mann' },
  { name: 'Alnilam', style: 'bestemt', gender: 'mann' },
  { name: 'Schedar', style: 'jevn', gender: 'mann' },
  { name: 'Achird', style: 'vennlig', gender: 'mann' },
  { name: 'Zubenelgenubi', style: 'uformell', gender: 'mann' },
  { name: 'Sadachbia', style: 'livlig', gender: 'mann' },
  { name: 'Sadaltager', style: 'kunnskapsrik', gender: 'mann' },
]

export const DEFAULT_GEMINI_VOICE = 'Kore'

// The voices teachers choose between, in word lists and listening exercises.
// Google Cloud TTS has Chirp 3 HD voices with the same names
// (nb-NO-Chirp3-HD-<name>), so the same four are offered in both places.
export const CHOSEN_VOICE_NAMES = ['Enceladus', 'Iapetus', 'Erinome', 'Callirrhoe'] as const
export type ChosenVoice = (typeof CHOSEN_VOICE_NAMES)[number]
export const CHOSEN_VOICES: GeminiVoice[] = CHOSEN_VOICE_NAMES.map(
  (name) => GEMINI_VOICES.find((v) => v.name === name) as GeminiVoice
)
export const DEFAULT_CHOSEN_VOICE: ChosenVoice = 'Erinome'

export function isChosenVoice(name: string | null | undefined): name is ChosenVoice {
  return (CHOSEN_VOICE_NAMES as readonly string[]).includes(name ?? '')
}

export function voiceLabel(v: GeminiVoice): string {
  return `${v.name} (${v.gender}, ${v.style})`
}

export function isGeminiVoice(name: string): boolean {
  return GEMINI_VOICES.some((v) => v.name === name)
}
