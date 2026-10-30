'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FlipCard } from '@/components/grammatikk/word-order/flip-card'
import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader, shuffle, store } from './shared'
import { SayWord, Sentence, usePronunciation, WordImage } from './pronunciation'

type FrontSide = 'bilde' | 'ord'

const faceClass =
  'flex min-h-[26rem] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-lg'

// Flashcards with "Øv mer" / "Kan det". Known words are remembered in the browser.
export function Flashcards({ words }: { words: Word[] }) {
  const { play } = usePronunciation()
  const [known, setKnown] = useState<string[]>(() => store.get('kan', []))
  const [front, setFront] = useState<FrontSide>(() => store.get('forside', 'bilde'))
  const [deck, setDeck] = useState<Word[]>(() => shuffle(words.filter((w) => !known.includes(w.id))))
  const [flipped, setFlipped] = useState(false)

  useEffect(() => store.set('kan', known), [known])
  useEffect(() => store.set('forside', front), [front])

  const knownCount = words.filter((w) => known.includes(w.id)).length
  const word = deck[0]

  function flip() {
    setFlipped((f) => !f)
    if (!flipped) play(word, 'w')
  }

  function practiceMore() {
    setFlipped(false)
    setDeck((d) => [...d.slice(1), d[0]])
  }

  function markKnown() {
    setFlipped(false)
    setKnown((k) => [...k, word.id])
    setDeck((d) => d.slice(1))
  }

  function reset() {
    const ids = new Set(words.map((w) => w.id))
    setKnown((k) => k.filter((id) => !ids.has(id)))
    setDeck(shuffle(words))
  }

  if (!word) {
    return (
      <div>
        <ExerciseHeader title="Flashcards" hint="Tenk på svaret, og trykk på kortet for å snu det." />
        <p className="mb-4 text-gray-800">
          Du har merket alle {words.length} ordene som «Kan det». Bra jobba!
        </p>
        <Button onClick={reset}>Øv på alle igjen</Button>
      </div>
    )
  }

  return (
    <div>
      <ExerciseHeader
        title="Flashcards"
        hint="Tenk på svaret, og trykk på kortet for å snu det."
        score={`${knownCount} av ${words.length} kan du`}
      />
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Forside:
          <select
            value={front}
            onChange={(event) => {
              setFront(event.target.value as FrontSide)
              setFlipped(false)
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900"
          >
            <option value="bilde">Bilde</option>
            <option value="ord">Ord</option>
          </select>
        </label>

        <div
          role="button"
          tabIndex={0}
          aria-label="Snu kortet"
          onClick={flip}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              flip()
            }
          }}
          className="w-full cursor-pointer rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <FlipCard
            flipped={flipped}
            front={
              <div className={faceClass}>
                {front === 'bilde' ? (
                  <WordImage word={word} alt="Hva heter dette på norsk?" className="w-4/5" />
                ) : (
                  <div className="text-4xl font-bold text-gray-900">{word.ord}</div>
                )}
              </div>
            }
            back={
              <div className={faceClass}>
                {front === 'ord' && <WordImage word={word} alt={word.en} className="w-1/2" />}
                <div className="text-4xl text-gray-900">
                  <SayWord word={word} className="font-bold" />
                </div>
                <div className="text-sm text-gray-500">
                  {word.boying}
                  <br />
                  <i>{word.en}</i>
                </div>
                <div className="text-gray-800">
                  <Sentence word={word} />
                </div>
                <div className="text-xs text-gray-500">
                  Hva heter det på ditt språk? Ligner det på norsk?
                </div>
              </div>
            }
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={practiceMore}
            className="border-2 border-red-400 text-red-700 hover:bg-red-50 hover:text-red-700"
          >
            Øv mer
          </Button>
          <Button
            variant="outline"
            onClick={markKnown}
            className="border-2 border-green-500 text-green-700 hover:bg-green-50 hover:text-green-700"
          >
            Kan det
          </Button>
        </div>
      </div>
    </div>
  )
}
