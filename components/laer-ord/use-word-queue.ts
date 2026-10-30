'use client'

import { useCallback, useRef, useState } from 'react'
import type { Word } from '@/lib/laer-ord/data'
import { shuffle } from './shared'

/**
 * Goes through the words in random order without repeats, and reshuffles
 * once every word has been shown. Also picks three wrong options.
 */
export function useWordQueue(words: Word[]) {
  const bagRef = useRef<Word[]>([])

  const draw = useCallback(() => {
    if (bagRef.current.length === 0) bagRef.current = shuffle(words)
    const word = bagRef.current.pop() as Word
    const options = shuffle([
      word,
      ...shuffle(words.filter((w) => w.id !== word.id)).slice(0, 3),
    ])
    return { word, options }
  }, [words])

  const [round, setRound] = useState(draw)
  const next = useCallback(() => setRound(draw()), [draw])

  return { ...round, next }
}
