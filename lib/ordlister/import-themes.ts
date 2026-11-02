'use client'

// Turns the built-in themes from the Ordbank prototype (lib/laer-ord/data.ts,
// files in public/laer-ord) into ordinary word lists owned by the admin who
// runs it, so they can be shared with groups like any other list.

import type { Theme } from '@/lib/laer-ord/data'
import { DEFAULT_GEMINI_VOICE } from '@/lib/tts/gemini-voices'
import { wordListStore } from './db-store'
import { uploadMedia } from './media'
import { contentSig, mediaSig, type MediaKind, type WordList, type WordListItem } from './types'

// The recordings were made with Gemini, but nobody knows which voice. The
// list is marked with the default voice, so nothing is recorded again unless
// the teacher picks another voice in the editor.
const VOICE = DEFAULT_GEMINI_VOICE

const FILES: Record<MediaKind, (id: string) => string> = {
  img: (id) => `/laer-ord/img/${id}.webp`,
  w: (id) => `/laer-ord/lyd/${id}.mp3`,
  s: (id) => `/laer-ord/lyd/${id}-s.mp3`,
}

export async function importTheme(theme: Theme, onProgress?: (done: number, total: number) => void): Promise<WordList> {
  const languages: string[] = []
  const words: WordListItem[] = theme.ord.map((w) => {
    const item: WordListItem = { id: crypto.randomUUID(), word: w.ord, imageDescription: '' }
    item.content = {
      sig: contentSig(item, languages),
      boying: w.boying,
      en: w.en,
      translations: {},
      s: w.s,
    }
    return item
  })

  // The list must exist before files can be stored under its id.
  const list = await wordListStore.save({ title: theme.navn, languages, words, groupIds: [] })

  let done = 0
  for (const [index, source] of theme.ord.entries()) {
    const item = words[index]
    const media: Partial<Record<MediaKind, string>> = {}
    for (const kind of ['img', 'w', 's'] as MediaKind[]) {
      const response = await fetch(FILES[kind](source.id))
      if (!response.ok) continue
      await uploadMedia(list.id, item.id, kind, await response.blob())
      const sig = mediaSig(item, kind, VOICE)
      if (sig) media[kind] = sig
    }
    item.media = media
    onProgress?.(++done, theme.ord.length)
  }

  return wordListStore.save({ id: list.id, title: theme.navn, languages, words, groupIds: [] })
}
