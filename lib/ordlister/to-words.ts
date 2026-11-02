'use client'

// Turns a teacher's word list into the words «Lær ord» trains on.

import type { Word } from '@/lib/laer-ord/data'
import { mediaStore } from './media-store'
import type { WordList } from './types'

export interface LoadedWords {
  words: Word[]
  release: () => void
}

export async function loadListWords(list: WordList, language: string): Promise<LoadedWords> {
  const urls: string[] = []
  const url = async (itemId: string, kind: 'img' | 'w' | 's', stored?: string) => {
    if (!stored) return undefined
    const blob = await mediaStore.get(itemId, kind)
    if (!blob) return undefined
    const objectUrl = URL.createObjectURL(blob)
    urls.push(objectUrl)
    return objectUrl
  }

  const words = await Promise.all(
    list.words
      .filter((item) => item.content)
      .map(async (item): Promise<Word> => {
        const content = item.content!
        return {
          id: item.id,
          ord: item.word,
          boying: content.boying,
          en: content.translations[language] || content.en,
          s: content.s,
          img: (await url(item.id, 'img', item.media?.img)) ?? null,
          lyd: {
            w: await url(item.id, 'w', item.media?.w),
            s: await url(item.id, 's', item.media?.s),
          },
        }
      })
  )

  return { words, release: () => urls.forEach((u) => URL.revokeObjectURL(u)) }
}
