'use client'

// Makes everything «Lær ord» needs for a teacher's word list: text from the
// language model, recordings from Google TTS and pictures from Google's
// image model. Only words that are new or changed are made again.

import { wordListStore } from './local-store'
import { mediaStore, shrinkImage } from './media-store'
import {
  contentSig,
  mediaSig,
  type MediaKind,
  type WordList,
  type WordListItem,
} from './types'

export type ItemStatus = 'venter' | 'tekst' | 'lyd' | 'bilde' | 'ferdig' | 'feil'

export interface GenerateOptions {
  withImages: boolean
  onStatus: (itemId: string, status: ItemStatus, error?: string) => void
  onList: (list: WordList) => void
}

const BATCH = 15
const PARALLEL = 3

const plainSentence = (s: string) => s.replace(/[[\]]/g, '')

async function errorText(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error || `Feil ${response.status}`
}

export async function imagesAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/ordlister/bilde')
    return Boolean(((await response.json()) as { available?: boolean }).available)
  } catch {
    return false
  }
}

export async function generateList(start: WordList, options: GenerateOptions): Promise<WordList> {
  let list = start
  const failed = new Set<string>()

  const commit = (words: WordListItem[]) => {
    list = { ...list, words }
    wordListStore.put(list)
    options.onList(list)
  }
  const patchItem = (id: string, patch: Partial<WordListItem>) =>
    commit(list.words.map((w) => (w.id === id ? { ...w, ...patch } : w)))

  for (const item of list.words) options.onStatus(item.id, 'venter')

  // 1. Text, in batches.
  const needText = list.words.filter((w) => w.content?.sig !== contentSig(w, list.languages))
  for (let i = 0; i < needText.length; i += BATCH) {
    const batch = needText.slice(i, i + BATCH)
    batch.forEach((w) => options.onStatus(w.id, 'tekst'))
    try {
      const response = await fetch('/api/ordlister/innhold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: list.title,
          languages: list.languages,
          words: batch.map((w) => ({ word: w.word, description: w.imageDescription || undefined })),
        }),
      })
      if (!response.ok) throw new Error(await errorText(response))
      const { words } = (await response.json()) as {
        words: { boying: string; en: string; oversettelser: Record<string, string>; s: string; motiv: string }[]
      }
      const byId = new Map(batch.map((w, n) => [w.id, words[n]]))
      commit(
        list.words.map((w) => {
          const made = byId.get(w.id)
          if (!made) return w
          return {
            ...w,
            content: {
              sig: contentSig(w, list.languages),
              boying: made.boying,
              en: made.en,
              translations: made.oversettelser,
              s: made.s,
              motif: made.motiv,
            },
          }
        })
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ukjent feil'
      batch.forEach((w) => {
        failed.add(w.id)
        options.onStatus(w.id, 'feil', message)
      })
    }
  }

  // 2. Recordings and pictures, a few words at a time.
  const kinds: MediaKind[] = options.withImages ? ['w', 's', 'img'] : ['w', 's']
  const queue = list.words.filter((w) => !failed.has(w.id)).map((w) => w.id)

  async function makeMedia(id: string) {
    for (const kind of kinds) {
      const item = list.words.find((w) => w.id === id)
      if (!item?.content) return
      const sig = mediaSig(item, kind)
      if (!sig || item.media?.[kind] === sig) continue

      options.onStatus(id, kind === 'img' ? 'bilde' : 'lyd')
      const response =
        kind === 'img'
          ? await fetch('/api/ordlister/bilde', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                word: item.word,
                theme: list.title,
                motif: (item.content.motif || item.imageDescription || item.content.en).slice(0, 400),
              }),
            })
          : await fetch('/api/ordlister/lyd', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: kind === 'w' ? item.word : plainSentence(item.content.s),
              }),
            })
      if (!response.ok) throw new Error(await errorText(response))

      let blob = await response.blob()
      if (kind === 'img') blob = await shrinkImage(blob)
      await mediaStore.put(id, kind, blob)
      patchItem(id, { media: { ...item.media, [kind]: sig } })
    }
  }

  async function worker() {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        await makeMedia(id)
        options.onStatus(id, 'ferdig')
      } catch (error) {
        options.onStatus(id, 'feil', error instanceof Error ? error.message : 'Ukjent feil')
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))

  return list
}
