'use client'

import { useState } from 'react'
import { BarChart3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FeiltypeOversikt as Feiltype } from '@/lib/sammendrag/analyse'

// Hovedgruppene i feilkodene (første bokstav i koden), med farge.
const KATEGORIER: Record<string, { navn: string; farge: string }> = {
  R: { navn: 'Staving', farge: 'bg-vlfk-gul' },
  S: { navn: 'Substantiv', farge: 'bg-vlfk-lyseblaa' },
  P: { navn: 'Pronomen', farge: 'bg-vlfk-lilla' },
  A: { navn: 'Adjektiv', farge: 'bg-vlfk-mork-rosa' },
  V: { navn: 'Verb', farge: 'bg-vlfk-morkegronn' },
  O: { navn: 'Ordstilling', farge: 'bg-vlfk-oransje' },
  K: { navn: 'Bindeord', farge: 'bg-vlfk-rod-oransje' },
  L: { navn: 'Ordvalg', farge: 'bg-vlfk-turkis' },
}

const UKJENT = { navn: 'Annet', farge: 'bg-gray-400' }

function kategori(kode: string) {
  return KATEGORIER[kode.charAt(0)] ?? UKJENT
}

type Visning = 'grafisk' | 'detaljert'

interface Props {
  feiltyper: Feiltype[]
  totalt: number
}

export function FeiltypeOversikt({ feiltyper, totalt }: Props) {
  const [visning, setVisning] = useState<Visning>('grafisk')

  if (feiltyper.length === 0) {
    return (
      <div>
        <h4 className="text-md font-semibold mb-2">Feiltyper i teksten</h4>
        <div className="bg-vlfk-lyseblaa/15 border border-vlfk-lyseblaa rounded-lg p-4 text-center">
          <p className="text-sm text-gray-700">🎉 Ingen feil funnet i teksten!</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-md font-semibold">Feiltyper i teksten</h4>
          <span className="text-sm text-gray-600">
            {totalt} {totalt === 1 ? 'feil' : 'feil totalt'}
          </span>
        </div>
        <div className="flex space-x-2" role="group" aria-label="Velg visning">
          <Button
            variant={visning === 'grafisk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisning('grafisk')}
            aria-pressed={visning === 'grafisk'}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Grafisk
          </Button>
          <Button
            variant={visning === 'detaljert' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisning('detaljert')}
            aria-pressed={visning === 'detaljert'}
          >
            <List className="h-4 w-4 mr-1" />
            Detaljert
          </Button>
        </div>
      </div>

      {visning === 'grafisk' ? (
        <GrafiskVisning feiltyper={feiltyper} totalt={totalt} />
      ) : (
        <DetaljertVisning feiltyper={feiltyper} />
      )}
    </div>
  )
}

function GrafiskVisning({ feiltyper, totalt }: Props) {
  // Summer per hovedgruppe, i den rekkefølgen gruppene først dukker opp
  // (feiltypene er allerede sortert etter antall).
  const grupper = new Map<string, number>()
  for (const f of feiltyper) {
    const bokstav = f.kode.charAt(0)
    grupper.set(bokstav, (grupper.get(bokstav) ?? 0) + f.antall)
  }
  const grupperSortert = [...grupper.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-vlfk-lyseblaa/15 border border-vlfk-lyseblaa rounded-lg p-4">
      {/* Fordeling på hovedgrupper */}
      <div>
        <div
          className="flex h-8 sm:h-10 w-full overflow-hidden rounded-full bg-white"
          role="img"
          aria-label={grupperSortert
            .map(([b, n]) => `${kategori(b).navn}: ${n}`)
            .join(', ')}
        >
          {grupperSortert.map(([bokstav, antall]) => (
            <div
              key={bokstav}
              className={`${kategori(bokstav).farge} h-full border-r-[3px] border-white last:border-r-0`}
              style={{ width: `${(antall / Math.max(totalt, 1)) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {grupperSortert.map(([bokstav, antall]) => (
            <li key={bokstav} className="flex items-center gap-2 text-sm sm:text-base text-gray-700">
              <span className={`inline-block h-3.5 w-3.5 rounded-full ${kategori(bokstav).farge}`} />
              {kategori(bokstav).navn} <span className="font-semibold">{antall}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DetaljertVisning({ feiltyper }: { feiltyper: Feiltype[] }) {
  return (
    <div className="bg-vlfk-lyseblaa/15 border border-vlfk-lyseblaa rounded-lg divide-y divide-vlfk-lyseblaa">
      {feiltyper.map((f) => (
        <div key={f.kode} className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span
                className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${kategori(f.kode).farge}`}
                title={kategori(f.kode).navn}
                aria-hidden="true"
              />
              <span className="flex-shrink-0 rounded bg-vlfk-ink px-1.5 py-0.5 text-xs font-bold text-white">
                {f.kode}
              </span>
              <span className="text-sm font-semibold text-gray-900">{f.feiltype}</span>
            </div>
            <span
              className="flex-shrink-0 rounded-full bg-white border border-vlfk-lyseblaa px-2.5 py-0.5 text-sm font-semibold text-vlfk-ink"
              aria-label={`${f.antall} ganger`}
            >
              {f.antall}×
            </span>
          </div>
          {(f.eksempel.feil || f.eksempel.riktig) && (
            <p className="mt-1.5 text-sm">
              <span className="text-red-600 line-through decoration-red-300">{f.eksempel.feil}</span>
              <span className="mx-2 text-gray-400">→</span>
              <span className="text-green-700 font-medium">{f.eksempel.riktig}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
