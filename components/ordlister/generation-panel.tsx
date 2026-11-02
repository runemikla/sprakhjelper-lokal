'use client'

import Link from 'next/link'
import { AlertCircle, Check, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ItemStatus } from '@/lib/ordlister/generate'
import type { WordList } from '@/lib/ordlister/types'
import { cn } from '@/lib/utils'

const LABEL: Record<ItemStatus, string> = {
  venter: 'Venter',
  tekst: 'Lager setning og oversettelse',
  lyd: 'Lager lyd',
  bilde: 'Lager bilde',
  ferdig: 'Ferdig',
  feil: 'Feilet',
}

interface GenerationPanelProps {
  list: WordList
  running: boolean
  statuses: Record<string, { status: ItemStatus; error?: string }>
  readyCount: number
  imagesOn: boolean
  onStart: () => void
}

// Shows what is being made for each word, and opens the list in «Lær ord».
export function GenerationPanel({
  list,
  running,
  statuses,
  readyCount,
  imagesOn,
  onStart,
}: GenerationPanelProps) {
  const total = list.words.length
  const allReady = readyCount === total
  const hasStatuses = Object.keys(statuses).length > 0
  const errors = Object.values(statuses).filter((s) => s.status === 'feil')

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">Øvelser i Lær ord</p>
          <p className="text-sm text-gray-600">
            {running
              ? `Lager innhold … ${readyCount} av ${total} ord er klare.`
              : allReady
                ? `Alle ${total} ord har ${imagesOn ? 'bilde, ' : ''}lyd, setning og oversettelse.`
                : `${readyCount} av ${total} ord er klare.`}
          </p>
        </div>
        <div className="flex gap-2">
          {!running && !allReady && (
            <Button type="button" onClick={onStart}>
              <Play className="h-4 w-4" /> Lag det som mangler
            </Button>
          )}
          <Button asChild variant={allReady ? 'default' : 'outline'} disabled={running}>
            <Link href={`/laer-ord?liste=${list.accessCode}`}>Åpne i Lær ord</Link>
          </Button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${total ? (readyCount / total) * 100 : 0}%` }}
        />
      </div>

      {!imagesOn && (
        <p className="mt-3 text-xs text-amber-800">
          Bildemodellen er ikke satt opp ennå, så ordene får foreløpig ikke bilder.
        </p>
      )}

      {hasStatuses && (running || errors.length > 0) && (
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {list.words.map((w) => {
            const s = statuses[w.id]
            if (!s) return null
            return (
              <li key={w.id} className="flex items-center gap-2" title={s.error}>
                {s.status === 'ferdig' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : s.status === 'feil' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : s.status === 'venter' ? (
                  <span className="h-4 w-4 rounded-full border-2 border-gray-200" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                <span className="font-medium text-gray-900">{w.word}</span>
                <span className={cn('text-gray-500', s.status === 'feil' && 'text-red-700')}>
                  {s.status === 'feil' && s.error ? s.error : LABEL[s.status]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
