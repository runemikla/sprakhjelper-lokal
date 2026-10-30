'use client'

import type { Word } from '@/lib/laer-ord/data'
import { ExerciseHeader } from './shared'
import { SayWord, Sentence, WordImage } from './pronunciation'

export function WordList({ words }: { words: Word[] }) {
  return (
    <div>
      <ExerciseHeader
        title="Ordliste"
        hint="Trykk på ordet for å høre uttalen, og på «Hør» for å høre setningen."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {words.map((word) => (
          <article
            key={word.id}
            className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3"
          >
            <WordImage word={word} alt={word.en} sizes="(min-width: 1024px) 220px, (min-width: 640px) 45vw, 90vw" />
            <div className="text-xl text-gray-900">
              <SayWord word={word} />
            </div>
            <div className="text-xs text-gray-500">
              {word.boying} · <i>{word.en}</i>
            </div>
            <div className="text-sm text-gray-800">
              <Sentence word={word} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
