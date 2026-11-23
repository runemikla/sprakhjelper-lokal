'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VelgOrdOving } from '@/lib/ovinger/types'
import { Tilbakemelding, type Svarstatus } from './tilbakemelding'

function bland<T>(liste: T[]): T[] {
  const kopi = [...liste]
  for (let i = kopi.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kopi[i], kopi[j]] = [kopi[j], kopi[i]]
  }
  return kopi
}

interface VelgOrdProps {
  oving: VelgOrdOving
  onForsteSvar: (riktig: boolean) => void
  onRiktig: () => void
  // Kalles hver gang svarstatusen endres (brukes til lærerbildet).
  onStatus?: (status: Svarstatus) => void
}

// «Fyll inn riktig ord»: eleven velger blant 2–4 alternativer.
export function VelgOrd({ oving, onForsteSvar, onRiktig, onStatus }: VelgOrdProps) {
  const alternativer = useMemo(() => bland(oving.alternativer), [oving])
  const [valgt, setValgt] = useState<string | null>(null)
  const [provd, setProvd] = useState<string[]>([])
  const status: Svarstatus =
    valgt === null ? 'idle' : valgt === oving.riktig_svar ? 'riktig' : 'feil'
  const ferdig = status === 'riktig'

  useEffect(() => {
    onStatus?.(status)
  }, [status, onStatus])

  const velg = (alt: string) => {
    if (ferdig || provd.includes(alt)) return
    const riktig = alt === oving.riktig_svar
    if (provd.length === 0) onForsteSvar(riktig)
    setProvd((p) => [...p, alt])
    setValgt(alt)
    if (riktig) onRiktig()
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl border-2 border-vlfk-lyseblaa bg-vlfk-lyseblaa/10 p-4 text-lg leading-relaxed text-gray-900">
        {oving.foer_luke}
        <span
          className={cn(
            'mx-1 inline-block min-w-[4.5rem] rounded-md border-b-2 px-2 text-center font-semibold',
            ferdig ? 'border-green-500 bg-green-100 text-green-800' : 'border-gray-400 text-gray-400'
          )}
        >
          {ferdig ? oving.riktig_svar : '…'}
        </span>
        {oving.etter_luke}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        {alternativer.map((alt) => {
          const erProvdFeil = provd.includes(alt) && alt !== oving.riktig_svar
          const erRiktigValgt = ferdig && alt === oving.riktig_svar
          return (
            <button
              key={alt}
              type="button"
              onClick={() => velg(alt)}
              disabled={ferdig || erProvdFeil}
              className={cn(
                'rounded-lg border-2 px-5 py-2 text-lg font-medium shadow-sm transition-all',
                'border-vlfk-lyseblaa bg-white text-gray-900',
                !ferdig && !erProvdFeil && 'hover:border-vlfk-ink hover:shadow',
                erProvdFeil && 'border-red-300 bg-red-50 text-red-400 line-through',
                erRiktigValgt && 'border-green-400 bg-green-50 text-green-800',
                ferdig && !erRiktigValgt && 'opacity-60'
              )}
            >
              {alt}
            </button>
          )
        })}
      </div>

      <Tilbakemelding
        status={status}
        forklaring={oving.forklaring}
        feilTekst="Ikke riktig. Prøv et annet ord."
      />
    </div>
  )
}
