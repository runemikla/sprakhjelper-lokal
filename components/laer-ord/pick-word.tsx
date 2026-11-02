'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader, Feedback } from './shared'
import { Sentence, usePronunciation, WordImage } from './pronunciation'
import { useWordQueue } from './use-word-queue'

// "Velg riktig ord": see a picture and pick the matching word.
export function PickWord({ words }: { words: Word[] }) {
  const { word, options, next } = useWordQueue(words)
  const { play } = usePronunciation()
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
      play(word, 'w')
    } else {
      setWrongIds((ids) => [...ids, option.id])
    }
  }

  const lastWrong = wrongIds.length > 0 ? words.find((w) => w.id === wrongIds.at(-1)) : null

  return (
    <div>
      <ExerciseHeader
        title="Hva er dette?"
        hint="Se på bildet og velg riktig ord."
        score={`${score.right} riktige av ${score.total}`}
      />
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <WordImage
          word={word}
          alt="Bilde av ordet du skal finne"
          className="mx-auto w-full max-w-[240px] border border-gray-200 sm:max-w-none"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {options.map((option) => {
              const isRight = solved && option.id === word.id
              const isWrong = wrongIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option)}
                  disabled={solved || isWrong}
                  className={cn(
                    'rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-lg font-semibold text-gray-900 transition-colors hover:border-blue-500 disabled:cursor-default',
                    isRight && 'border-green-500 bg-green-50 text-green-700 hover:border-green-500',
                    isWrong && 'animate-shake border-red-400 bg-red-50 text-red-700 hover:border-red-400'
                  )}
                >
                  {option.ord}
                </button>
              )
            })}
          </div>
          {solved ? (
            <div className="space-y-3">
              <Feedback tone="right">
                Riktig! <Sentence word={word} />
              </Feedback>
              <Button ref={nextRef} onClick={next}>
                Neste bilde
              </Button>
            </div>
          ) : (
            lastWrong && (
              <Feedback tone="wrong">
                Det er <i>{lastWrong.en}</i>. Prøv igjen.
              </Feedback>
            )
          )}
        </div>
      </div>
    </div>
  )
}
