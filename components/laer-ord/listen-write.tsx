'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader, Feedback } from './shared'
import { PlayButtons } from './play-buttons'
import { SayWord, Sentence, WordImage } from './pronunciation'
import { useWordQueue } from './use-word-queue'

const MAX_TRIES = 3

// Letter-by-letter comparison: green letters are right, red are wrong, and
// "_" marks a missing letter at the end.
function LetterDiff({ answer, target }: { answer: string; target: string }) {
  const targetLetters = [...target]
  const answerLetters = [...answer]
  return (
    <span className="text-2xl font-semibold tracking-wider">
      {answerLetters.map((letter, i) => (
        <span
          key={i}
          className={letter === targetLetters[i] ? 'text-green-700' : 'text-red-600 underline'}
        >
          {letter}
        </span>
      ))}
      {targetLetters.slice(answerLetters.length).map((_, i) => (
        <span key={`missing-${i}`} className="text-red-600">
          _
        </span>
      ))}
    </span>
  )
}

// "Hør og skriv": hear a word (with a picture as help) and spell it.
export function ListenWrite({ words }: { words: Word[] }) {
  const { word, next } = useWordQueue(words)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const target = word.ord.toLowerCase()
  const solved = checked === target
  const gaveUp = !solved && tries >= MAX_TRIES

  useEffect(() => {
    setAnswer('')
    setChecked(null)
    setTries(0)
  }, [word])

  useEffect(() => {
    if (solved || gaveUp) nextRef.current?.focus()
  }, [solved, gaveUp])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = answer.trim().toLowerCase()
    if (!normalized || solved || gaveUp) return
    setChecked(normalized)
    setTries((t) => t + 1)
    if (normalized !== target) inputRef.current?.select()
  }

  return (
    <div>
      <ExerciseHeader title="Hør og skriv" hint="Hør ordet, og skriv det. Bildet hjelper deg." />
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <WordImage
          word={word}
          alt="Bilde av ordet"
          className="mx-auto w-full max-w-[240px] border border-gray-200 sm:max-w-none"
        />
        <div className="space-y-4">
          <PlayButtons word={word} onPlay={() => inputRef.current?.focus()} />
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
            <label htmlFor="laer-ord-answer" className="sr-only">
              Skriv ordet
            </label>
            <input
              id="laer-ord-answer"
              ref={inputRef}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={solved || gaveUp}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Skriv ordet"
              className={cn(
                'w-full max-w-xs rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-2xl font-semibold text-gray-900 outline-none focus:border-blue-500',
                solved && 'border-green-500 bg-green-50'
              )}
            />
            <Button type="submit" disabled={solved || gaveUp}>
              Sjekk
            </Button>
          </form>

          {solved && (
            <div className="space-y-3">
              <Feedback tone="right">
                Riktig! <Sentence word={word} />
              </Feedback>
              <Button ref={nextRef} onClick={next}>
                Neste ord
              </Button>
            </div>
          )}
          {gaveUp && (
            <div className="space-y-3">
              <Feedback>
                Ordet skrives <SayWord word={word} className="text-lg" />. <Sentence word={word} />
              </Feedback>
              <Button ref={nextRef} onClick={next}>
                Neste ord
              </Button>
            </div>
          )}
          {checked && !solved && !gaveUp && (
            <Feedback tone="wrong">
              <p>
                Ikke helt. Grønne bokstaver er riktige, røde er feil, og _ betyr at det mangler
                en bokstav:
              </p>
              <p className="my-2">
                <LetterDiff answer={checked} target={target} />
              </p>
              <p>Hør en gang til, og prøv igjen.</p>
            </Feedback>
          )}
        </div>
      </div>
    </div>
  )
}
