'use client'

// Pictures and recordings for the word lists live in the public storage
// bucket «word-lists» as <list id>/<item id>-<kind>.<ext>.

import { createClient } from '@/lib/supabase/client'
import type { MediaKind, WordListItem } from './types'

const BUCKET = 'word-lists'

const EXT: Record<MediaKind, string> = { img: 'webp', w: 'mp3', s: 'mp3' }
const TYPE: Record<MediaKind, string> = { img: 'image/webp', w: 'audio/mpeg', s: 'audio/mpeg' }

export function mediaPath(listId: string, itemId: string, kind: MediaKind) {
  return `${listId}/${itemId}-${kind}.${EXT[kind]}`
}

// Small hash so a new version of a file gets a new URL (the bucket is cached).
function version(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// Public URL of a stored file, or undefined when the word has no such file.
export function mediaUrl(listId: string, item: WordListItem, kind: MediaKind): string | undefined {
  const stored = item.media?.[kind]
  if (!stored) return undefined
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(mediaPath(listId, item.id, kind))
  return `${data.publicUrl}?v=${version(stored)}`
}

export async function uploadMedia(listId: string, itemId: string, kind: MediaKind, blob: Blob) {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    // Recordings are WAV from Gemini or MP3 from Google Cloud; the stored
    // content type decides how the browser plays them, not the file name.
    .upload(mediaPath(listId, itemId, kind), blob, {
      upsert: true,
      contentType: blob.type || TYPE[kind],
    })
  if (error) throw new Error(error.message || 'Kunne ikke lagre filen.')
}

// Pictures come back as 1024×1024. Shrink them before upload.
export async function shrinkImage(blob: Blob, size = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size, size)
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85))
    return out ?? blob
  } catch {
    return blob
  }
}
