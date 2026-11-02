'use client'

import { mediaUrl } from '@/lib/ordlister/media'
import type { WordListItem } from '@/lib/ordlister/types'

// The generated picture for a word, from the storage bucket.
export function ItemThumb({ listId, item }: { listId: string; item: WordListItem }) {
  const url = mediaUrl(listId, item, 'img')
  if (!url) return <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100" aria-hidden="true" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
}
