'use client'

// Turns a teacher's word list into the words «Lær ord» trains on.

import type { Word } from '@/lib/laer-ord/data'
import { mediaUrl } from './media'
import type { WordList } from './types'

export function listWords(list: WordList, language: string): Word[] {
  return list.words
    .filter((item) => item.content)
    .map((item): Word => {
      const content = item.content!
      return {
        id: item.id,
        ord: item.word,
        boying: content.boying,
        en: content.translations[language] || content.en,
        s: content.s,
        img: mediaUrl(list.id, item, 'img') ?? null,
        lyd: {
          w: mediaUrl(list.id, item, 'w'),
          s: mediaUrl(list.id, item, 's'),
        },
      }
    })
}
