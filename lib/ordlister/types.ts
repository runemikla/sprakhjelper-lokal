// Teacher-made word lists («Ordlister»).
//
// For now (UI preview only) the lists live in the teacher's browser via
// localStorage. The shapes below match the planned Supabase tables
// `word_lists` and `word_list_items`, so the storage layer can be swapped
// without touching the components.

export interface WordListItem {
  id: string
  word: string
  // Optional hint for the image model, e.g. «et rødt eple på et bord».
  imageDescription: string
}

export interface WordList {
  id: string
  title: string
  // Four-character code students type to open the list.
  accessCode: string
  // The students' first languages (morsmål). Several can be chosen.
  languages: string[]
  words: WordListItem[]
  createdAt: string
  updatedAt: string
}

// Common first languages among students learning Norwegian as a second
// language. Teachers can also add a language that is not listed.
export const COMMON_LANGUAGES = [
  'Arabisk',
  'Somali',
  'Tigrinja',
  'Ukrainsk',
  'Polsk',
  'Litauisk',
  'Dari',
  'Pashto',
  'Persisk',
  'Kurdisk (sorani)',
  'Kurdisk (kurmanji)',
  'Tyrkisk',
  'Urdu',
  'Tamil',
  'Amharisk',
  'Oromo',
  'Swahili',
  'Russisk',
  'Rumensk',
  'Bosnisk/kroatisk/serbisk',
  'Albansk',
  'Thai',
  'Tagalog',
  'Vietnamesisk',
  'Burmesisk',
  'Kinesisk',
  'Engelsk',
  'Spansk',
  'Fransk',
  'Portugisisk',
] as const

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateAccessCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function normalizeAccessCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidAccessCode(value: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(value)
}
