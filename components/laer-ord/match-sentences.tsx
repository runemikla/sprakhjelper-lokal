'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader, Feedback, shuffle } from './shared'
import { usePronunciation } from './pronunciation'

const ROUND_SIZE = 5

function newRound(words: Word[]) {
  const set = shuffle(words).slice(0, ROUND_SIZE)
  return { words: shuffle(set), sentences: shuffle(set) }
}

// The example sentence with a blank where the word goes, or the word filled in.
function GappedSentence({ word, filled }: { word: Word; filled: boolean }) {
  const match = /^(.*?)\[(.+?)\](.*)$/.exec(word.s)
  if (!match) return <span>{word.s}</span>
  return (
    <span>
      {match[1]}
      {filled ? (
        <b className="text-green-700">{match[2]}</b>
      ) : (
        <span className="inline-block min-w-[4.5em] border-b-2 border-gray-400 align-baseline">
          &nbsp;
        </span>
      )}
      {match[3]}
    </span>
  )
}

// "Match ord og setning": pick a word, then the sentence it belongs in.
export function MatchSentences({ words }: { words: Word[] }) {
  const { play } = usePronunciation()
  const [round, setRound] = useState(() => newRound(words))
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [wrong, setWrong] = useState<{ id: string; n: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const restart = useCallback(() => {
    setRound(newRound(words))
    setSelected(null)
    setDone([])
    setWrong(null)
    setMessage(null)
  }, [words])

  const finished = done.length === round.sentences.length

  function pickWord(word: Word) {
    if (done.includes(word.id)) return
    setSelected(word.id)
    setMessage(null)
    play(word, 'w')
  }

  function pickSentence(word: Word) {
    if (done.includes(word.id)) {
      play(word, 's')
      return
    }
    if (!selected) {
      setMessage('Velg et ord først.')
      return
    }
    if (selected === word.id) {
      setDone((ids) => [...ids, word.id])
      setSelected(null)
      setWrong(null)
      setMessage(null)
      play(word, 's')
    } else {
      // A new key each time restarts the shake animation.
      setWrong((w) => ({ id: word.id, n: (w?.n ?? 0) + 1 }))
      setMessage('Ordet passer ikke her. Prøv en annen setning.')
    }
  }

  return (
    <div>
      <ExerciseHeader
        title="Match ord og setning"
        hint="Velg et ord, og trykk på setningen der ordet passer."
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          {round.words.map((word) => {
            const isDone = done.includes(word.id)
            return (
              <button
                key={word.id}
                type="button"
                onClick={() => pickWord(word)}
                disabled={isDone}
                className={cn(
                  'rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-left text-lg font-semibold text-gray-900 hover:border-blue-500',
                  selected === word.id && 'border-blue-500 bg-blue-50',
                  isDone && 'cursor-default border-green-500 bg-green-50 opacity-60 hover:border-green-500'
                )}
              >
                {word.ord}
              </button>
            )
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {round.sentences.map((word) => {
            const isDone = done.includes(word.id)
            const isWrong = wrong?.id === word.id
            return (
              <button
                key={isWrong ? `${word.id}-${wrong.n}` : word.id}
                type="button"
                onClick={() => pickSentence(word)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-3 py-1.5 text-left text-gray-900 hover:border-blue-500',
                  isDone && 'border-green-500 bg-green-50 hover:border-green-500',
                  isWrong && 'animate-shake border-red-400'
                )}
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image
                    src={`/laer-ord/img/${word.id}.webp`}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </span>
                <GappedSentence word={word} filled={isDone} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {finished ? (
          <>
            <Feedback tone="right">
              Alle riktige! Trykk på en setning for å høre den igjen.
            </Feedback>
            <Button onClick={restart}>Ny runde</Button>
          </>
        ) : (
          message && <Feedback tone="wrong">{message}</Feedback>
        )}
      </div>
    </div>
  )
}
