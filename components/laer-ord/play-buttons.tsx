'use client'

import { Play } from 'lucide-react'
import type { Word } from '@/lib/laer-ord/data'
import { usePronunciation } from './pronunciation'

// Large "Hør ordet" button plus a slower variant, used in the listening exercises.
export function PlayButtons({ word, onPlay }: { word: Word; onPlay?: () => void }) {
  const { play } = usePronunciation()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          play(word, 'w')
          onPlay?.()
        }}
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-blue-700"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        Hør ordet
      </button>
      <button
        type="button"
        onClick={() => {
          play(word, 'w', { slow: true })
          onPlay?.()
        }}
        className="rounded-full border-2 border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
      >
        Sakte
      </button>
    </div>
  )
}
