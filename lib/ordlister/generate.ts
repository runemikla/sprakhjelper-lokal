'use client'

// Makes everything «Lær ord» needs for a teacher's word list: text from the
// language model, recordings from Google TTS and pictures from Google's
// image model. Only words that are new or changed are made again. Text is
// stored in the database and files in the word-lists bucket as they finish.

import { wordListStore } from './db-store'
import { shrinkImage, uploadMedia } from './media'
import {
  contentSig,
  mediaSig,
  sameMedia,
  type MediaKind,
  type WordList,
  type WordListItem,
} from './types'

export type ItemStatus = 'venter' | 'tekst' | 'lyd' | 'bilde' | 'ferdig' | 'feil'

export interface GenerateOptions {
  withImages: boolean
  // Gemini voice for the recordings.
  voice: string
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

// Thrown when the teacher has made as many pictures as they may today.
export class ImageLimitError extends Error {}

// How many more pictures the teacher can make (see lib/ordlister/image-quota.ts).
export type ImageQuota =
  | { limited: false }
  | { limited: true; limit: number; used: number; remaining: number }

export interface ImageStatus {
  available: boolean
  quota: ImageQuota
}

export async function imageStatus(): Promise<ImageStatus> {
  try {
    const response = await fetch('/api/ordlister/bilde', { cache: 'no-store' })
    const body = (await response.json()) as Partial<ImageStatus>
    return { available: Boolean(body.available), quota: body.quota ?? { limited: false } }
  } catch {
    return { available: false, quota: { limited: false } }
  }
}

// Draws the picture for one word and stores it in the bucket. The caller
// records the new version on the item.
async function drawImage(list: WordList, item: WordListItem) {
  if (!item.content) throw new Error('Ordet mangler tekst. Trykk «Lag det som mangler» først.')
  const response = await fetch('/api/ordlister/bilde', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: item.word,
      theme: list.title,
      context: list.imageContext.trim() || undefined,
      motif: (item.content.motif || item.imageDescription || item.content.en).slice(0, 400),
    }),
  })
  if (response.status === 429) {
    const body = (await response.clone().json().catch(() => null)) as { code?: string } | null
    if (body?.code === 'image_limit') throw new ImageLimitError(await errorText(response))
  }
  if (!response.ok) throw new Error(await errorText(response))
  const blob = await shrinkImage(await response.blob())
  await uploadMedia(list.id, item.id, 'img', blob)
}

// «Lag nytt bilde»: a new picture for one word from the same description.
// Text, translations and recordings stay as they are.
export async function remakeImage(list: WordList, itemId: string): Promise<WordList> {
  const item = list.words.find((w) => w.id === itemId)
  const sig = item && mediaSig(item, 'img', '', list.imageContext)
  if (!item || !sig) throw new Error('Fant ikke ordet.')
  await drawImage(list, item)
  const media = { ...item.media, img: `${sig}#${Date.now().toString(36)}` }
  await wordListStore.patchItem(item.id, { media })
  return { ...list, words: list.words.map((w) => (w.id === item.id ? { ...w, media } : w)) }
}

export async function generateList(start: WordList, options: GenerateOptions): Promise<WordList> {
  let list = start
  const failed = new Set<string>()

  const commit = (words: WordListItem[]) => {
    list = { ...list, words }
    options.onList(list)
  }
  const patchItem = async (id: string, patch: Partial<WordListItem>) => {
    await wordListStore.patchItem(id, patch)
    commit(list.words.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

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
      for (const [n, w] of batch.entries()) {
        const made = words[n]
        if (!made) continue
        await patchItem(w.id, {
          content: {
            sig: contentSig(w, list.languages),
            boying: made.boying,
            en: made.en,
            translations: made.oversettelser,
            s: made.s,
            motif: made.motiv,
          },
        })
      }
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
  // Set when the teacher reaches the daily picture limit; the rest of the
  // words then get their recordings but no new picture.
  let imageLimit: string | null = null

  async function makeMedia(id: string) {
    for (const kind of kinds) {
      const item = list.words.find((w) => w.id === id)
      if (!item?.content) return
      const sig = mediaSig(item, kind, options.voice, list.imageContext)
      if (!sig || sameMedia(item.media?.[kind], sig)) continue

      if (kind === 'img') {
        if (imageLimit) throw new ImageLimitError(imageLimit)
        options.onStatus(id, 'bilde')
        try {
          await drawImage(list, item)
        } catch (error) {
          if (error instanceof ImageLimitError) imageLimit = error.message
          throw error
        }
      } else {
        options.onStatus(id, 'lyd')
        const response = await fetch('/api/ordlister/lyd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: kind === 'w' ? item.word : plainSentence(item.content.s),
            voice: options.voice,
          }),
        })
        if (!response.ok) throw new Error(await errorText(response))
        await uploadMedia(list.id, id, kind, await response.blob())
      }
      await patchItem(id, { media: { ...item.media, [kind]: sig } })
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
