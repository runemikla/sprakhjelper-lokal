'use client'

import { useEffect, useState } from 'react'
import { mediaStore } from '@/lib/ordlister/media-store'

// The generated picture for a word, read from the browser's storage.
export function ItemThumb({ itemId, version }: { itemId: string; version?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    if (version) {
      void mediaStore.get(itemId, 'img').then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
    }
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [itemId, version])

  if (!url) return <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100" aria-hidden="true" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
}
