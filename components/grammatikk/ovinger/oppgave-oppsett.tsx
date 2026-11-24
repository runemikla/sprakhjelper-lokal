import type { ReactNode } from 'react'

// Same heading style as «Din setning:» and «Forslag til forbedringer:» in Skrivehjelp.
export const OVERSKRIFT = 'text-lg font-semibold'

interface OppgaveToppProps {
  // Badges shown next to the heading (feiltype, «Fra teksten din»).
  merker?: ReactNode
  // Teacher image to the right (hidden on phones, as in Skrivehjelp).
  bilde?: ReactNode
  children: ReactNode
}

// The top of an exercise, laid out like «Din setning:» in Skrivehjelp:
// heading and the sentence on the left, the teacher image on the right.
export function OppgaveTopp({ merker, bilde, children }: OppgaveToppProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
          <p className={OVERSKRIFT}>Din setning:</p>
          {merker && <div className="flex flex-wrap gap-2">{merker}</div>}
        </div>
        {children}
      </div>
      {bilde && <div className="hidden shrink-0 sm:block">{bilde}</div>}
    </div>
  )
}
