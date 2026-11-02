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
  // Text made by the language model for «Lær ord». `sig` records which
  // word, description and languages it was made for, so only changed words
  // are made again.
  content?: ItemContent
  // Which version of each recording/picture is stored (same idea as `sig`).
  // The files themselves are in IndexedDB (see media-store.ts).
  media?: Partial<Record<MediaKind, string>>
}

export interface ItemContent {
  sig: string
  boying: string
  en: string
  translations: Record<string, string>
  // Example sentence with the word in [brackets].
  s: string
  // English description of what the picture shows (for the image model).
  motif?: string
}

// img: picture, w: the word read aloud, s: the example sentence read aloud.
export type MediaKind = 'img' | 'w' | 's'

export function contentSig(item: Pick<WordListItem, 'word' | 'imageDescription'>, languages: string[]) {
  return JSON.stringify([item.word, item.imageDescription, [...languages].sort()])
}

export function mediaSig(item: WordListItem, kind: MediaKind): string | null {
  if (kind === 'img') return JSON.stringify([item.word, item.imageDescription])
  if (kind === 'w') return item.word
  return item.content?.s ?? null
}

// True when the word has everything «Lær ord» uses.
export function isItemReady(item: WordListItem, languages: string[], withImages: boolean) {
  if (item.content?.sig !== contentSig(item, languages)) return false
  const kinds: MediaKind[] = withImages ? ['w', 's', 'img'] : ['w', 's']
  return kinds.every((k) => item.media?.[k] === mediaSig(item, k))
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
