'use client'

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
  if (status === 'idle') return null
  const riktig = status === 'riktig'
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl px-4 py-3 text-base',
        riktig ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      )}
    >
      {riktig ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div>
        <p className="font-medium">{riktig ? 'Riktig!' : feilTekst}</p>
        {riktig && forklaring && <p className="mt-1 text-sm">{forklaring}</p>}
      </div>
    </div>
  )
}
