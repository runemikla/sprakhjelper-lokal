'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Svarstatus = 'idle' | 'riktig' | 'feil'

interface TilbakemeldingProps {
  status: Svarstatus
  forklaring: string
  feilTekst: string
}

// Kort beskjed under en øving: riktig (med forklaring) eller prøv igjen.
export function Tilbakemelding({ status, forklaring, feilTekst }: TilbakemeldingProps) {
  const ref = useRef<HTMLDivElement>(null)
  // The exercise panel has a fixed height and scrolls inside, so make sure
  // the feedback is visible (on phones it can end up below the fold).
  useEffect(() => {
    if (status !== 'idle') ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [status])
  if (status === 'idle') return null
  const riktig = status === 'riktig'
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(
        // Same box as «Forslag til forbedringer» in Skrivehjelp.
        'flex items-start gap-2 rounded-lg border p-3 text-sm sm:p-4',
        riktig ? 'border-green-300 bg-green-50 text-green-900' : 'border-red-300 bg-red-50 text-red-900'
      )}
    >
      {riktig ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p className="font-medium">{riktig ? 'Riktig!' : feilTekst}</p>
        {riktig && forklaring && <p className="mt-1">{forklaring}</p>}
      </div>
    </div>
  )
}
