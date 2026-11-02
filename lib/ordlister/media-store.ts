'use client'

// Pictures and recordings for the teachers' word lists, kept in the
// browser's IndexedDB until the lists move to Supabase Storage.

import type { MediaKind } from './types'

const DB_NAME = 'ordlister'
const STORE = 'media'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

const key = (itemId: string, kind: MediaKind) => `${itemId}:${kind}`

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const request = fn(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const mediaStore = {
  async put(itemId: string, kind: MediaKind, blob: Blob) {
    await run('readwrite', (s) => s.put(blob, key(itemId, kind)))
  },
  async get(itemId: string, kind: MediaKind): Promise<Blob | undefined> {
    try {
      return await run<Blob | undefined>('readonly', (s) => s.get(key(itemId, kind)))
    } catch {
      return undefined
    }
  },
  async removeItem(itemId: string) {
    try {
      for (const kind of ['img', 'w', 's'] as MediaKind[]) {
        await run('readwrite', (s) => s.delete(key(itemId, kind)))
      }
    } catch {
      // Ignore: nothing stored.
    }
  },
}

// Pictures come back as 1024×1024. Shrink them so many lists fit in the
// browser.
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
