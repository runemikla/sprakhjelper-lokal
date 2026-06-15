// Difficulty levels for the word-order exercise (1 = easiest, 7 = hardest).
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const MIN_LEVEL = 1
export const MAX_LEVEL = 7

// A single draggable word. Words can repeat in a sentence, so each token
// needs a stable unique id independent of its text.
export interface WordToken {
  id: string
  text: string
}

// The two drop zones a token can live in.
export type Zone = 'bank' | 'sentence'

// Short labels/descriptions used by the slider UI. The detailed grammatical
// instructions and example sentences live server-side in the API route.
export const LEVELS: { value: Level; label: string; description: string }[] = [
  {
    value: 1,
    label: 'Subjekt + verb + objekt',
    description: 'Enkle setninger (f.eks. «Jeg leser en bok»)',
  },
  {
    value: 2,
    label: 'Adjektiv og flere ledd',
    description: 'F.eks. «Den lille hunden løper fort»',
  },
  {
    value: 3,
    label: 'Nektelse',
    description: 'Setninger med «ikke» (f.eks. «Jeg liker ikke fisk»)',
  },
  {
    value: 4,
    label: 'Tidsuttrykk og V2-regelen',
    description: 'Innledende adverbial (f.eks. «I dag skal jeg jobbe»)',
  },
  {
    value: 5,
    label: 'Modalverb',
    description: 'kan, vil, må, skal, bør (f.eks. «Jeg må gjøre lekser»)',
  },
  {
    value: 6,
    label: 'Sammensatte setninger',
    description: 'og, men, fordi, så (f.eks. «… fordi bussen var sen»)',
  },
  {
    value: 7,
    label: 'Leddsetninger',
    description: 'som, når, hvis, at, selv om',
  },
]

// Look up the metadata for a given level.
export function getLevelInfo(level: Level) {
  return LEVELS.find((l) => l.value === level) ?? LEVELS[0]
}
