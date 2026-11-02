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

export function isGeminiVoice(name: string): boolean {
  return GEMINI_VOICES.some((v) => v.name === name)
}
