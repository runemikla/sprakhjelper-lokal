// Teacher-made word lists for «Lær ord», stored in Supabase (tables
// word_lists, word_list_items and word_list_groups; files in the
// word-lists storage bucket). See lib/ordlister/db-store.ts.

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
  // The files themselves are in the word-lists storage bucket (see media.ts).
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

// Recordings carry the voice in their version, so choosing another voice
// makes them again. Pictures carry the list's picture context, so changing
// it makes them again (lists without context keep their old versions).
export function mediaSig(
  item: WordListItem,
  kind: MediaKind,
  voice: string,
  imageContext = ''
): string | null {
  if (kind === 'img') {
    const context = imageContext.trim()
    return JSON.stringify(context ? [item.word, item.imageDescription, context] : [item.word, item.imageDescription])
  }
  const text = kind === 'w' ? item.word : item.content?.s
  return text ? JSON.stringify([text, voice]) : null
}

// The voice the list's recordings were made with, if any.
export function listVoice(list: Pick<WordList, 'words'>): string | null {
  for (const item of list.words) {
    try {
      const parsed = JSON.parse(item.media?.w ?? '')
      if (Array.isArray(parsed) && typeof parsed[1] === 'string') return parsed[1]
    } catch {
      // Older recordings store only the word.
    }
  }
  return null
}

// True when the word has everything «Lær ord» uses.
export function isItemReady(
  item: WordListItem,
  languages: string[],
  withImages: boolean,
  voice: string,
  imageContext = ''
) {
  if (item.content?.sig !== contentSig(item, languages)) return false
  const kinds: MediaKind[] = withImages ? ['w', 's', 'img'] : ['w', 's']
  return kinds.every((k) => item.media?.[k] === mediaSig(item, k, voice, imageContext))
}

export interface WordList {
  id: string
  title: string
  // The students' first languages (morsmål). Several can be chosen.
  languages: string[]
  // Context that applies to every picture in the list, e.g. «Alle bildene
  // skal vise voksne i et klasserom». Added to the image prompt.
  imageContext: string
  words: WordListItem[]
  // Groups the list is shared with. Students in these groups see it.
  groupIds: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// A group a teacher made (see /grupper).
export interface Group {
  id: string
  name: string
  // Only shown to the owner and admins.
  accessCode: string | null
  ownerEmail: string | null
  memberCount: number
  isOwner: boolean
  isMember: boolean
  createdAt: string
}

// Common first languages among students learning Norwegian as a second
// language. Teachers can also add a language that is not listed.
export const COMMON_LANGUAGES = [
  'Arabisk',
  'Arabisk (syrisk dialekt)',
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

export function normalizeGroupCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidGroupCode(value: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(value)
}
