import type { Metadata } from 'next'
import { OmPage } from '@/components/om/om-page'
import { ENDRINGSLOGG, type Endringstype } from '@/lib/endringslogg'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Endringslogg - Språkhjelp',
}

const TYPE_LABEL: Record<Endringstype, { label: string; className: string }> = {
  nytt: { label: 'Nytt', className: 'bg-green-100 text-green-800' },
  forbedret: { label: 'Forbedret', className: 'bg-blue-100 text-blue-800' },
  rettet: { label: 'Rettet', className: 'bg-amber-100 text-amber-800' },
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function EndringsloggPage() {
  return (
    <OmPage
      current="/endringslogg"
      title="Endringslogg"
      intro="Her ser du hva som er nytt og endret i Språkhjelp. Nyeste endringer står øverst."
    >
      <ol className="relative border-l border-gray-200 ml-2 space-y-10">
        {ENDRINGSLOGG.map((entry) => (
          <li key={entry.dato} className="ml-6">
            <span
              className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-gray-900">
              <time dateTime={entry.dato}>{formatDate(entry.dato)}</time>
              {entry.tittel ? <span className="text-gray-500 font-normal"> · {entry.tittel}</span> : null}
            </h2>
            <ul className="mt-3 space-y-2">
              {entry.endringer.map((endring) => {
                const type = TYPE_LABEL[endring.type]
                return (
                  <li key={endring.tekst} className="flex items-start gap-3 text-gray-700 leading-relaxed">
                    <span
                      className={cn(
                        'mt-0.5 inline-flex w-20 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        type.className
                      )}
                    >
                      {type.label}
                    </span>
                    <span>{endring.tekst}</span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </OmPage>
  )
}
