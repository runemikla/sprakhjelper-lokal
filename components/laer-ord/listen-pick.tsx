'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader, Feedback } from './shared'
import { PlayButtons } from './play-buttons'
import { SayWord, Sentence, WordImage } from './pronunciation'
import { useWordQueue } from './use-word-queue'

// "Lytt og velg": hear a word and pick the matching picture.
export function ListenPick({ words }: { words: Word[] }) {
  const { word, options, next } = useWordQueue(words)
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setWrongIds([])
    setSolved(false)
  }, [word])

  useEffect(() => {
    if (solved) nextRef.current?.focus()
  }, [solved])

  function choose(option: Word) {
    if (solved || wrongIds.includes(option.id)) return
    if (option.id === word.id) {
      setSolved(true)
      setScore((s) => ({
        right: s.right + (wrongIds.length === 0 ? 1 : 0),
        total: s.total + 1,
      }))
    } else {
      setWrongIds((ids) => [...ids, option.id])
    }
  }

  const lastWrong = wrongIds.length > 0 ? words.find((w) => w.id === wrongIds.at(-1)) : null

  return (
    <div>
      <ExerciseHeader
        title="Lytt og velg"
        hint="Hør ordet, og trykk på riktig bilde."
        score={`${score.right} riktige av ${score.total}`}
      />
      <div className="space-y-5">
        <PlayButtons word={word} />
        <div className="grid max-w-sm grid-cols-2 gap-3">
          {options.map((option) => {
            const isRight = solved && option.id === word.id
            const isWrong = wrongIds.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-label="Bilde"
                onClick={() => choose(option)}
                disabled={solved || isWrong}
                className={cn(
                  'overflow-hidden rounded-xl border-[3px] border-gray-200 bg-white transition-colors hover:border-blue-500 disabled:cursor-default',
                  isRight && 'border-green-500 hover:border-green-500',
                  isWrong && 'animate-shake border-red-400 opacity-50 hover:border-red-400'
                )}
              >
                <WordImage word={option} className="rounded-none" sizes="180px" />
              </button>
            )
          })}
        </div>
        {solved ? (
          <div className="space-y-3">
            <Feedback tone="right">
              Riktig, det er <SayWord word={word} />. <Sentence word={word} />
            </Feedback>
            <Button ref={nextRef} onClick={next}>
              Neste ord
            </Button>
          </div>
        ) : (
          lastWrong && (
            <Feedback tone="wrong">
              Det var <SayWord word={lastWrong} />. Hør en gang til, og prøv igjen.
            </Feedback>
          )
        )}
      </div>
    </div>
  )
}
