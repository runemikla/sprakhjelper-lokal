import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { OmPage } from '@/components/om/om-page'
import { NOR11_01, NVI } from '@/lib/laereplaner'

export const metadata: Metadata = {
  title: 'Læreplaner - Språkhjelp',
}

const linkClass = 'text-blue-700 underline underline-offset-4 hover:text-blue-800'

function Level({
  title,
  subtitle,
  open,
  children,
}: {
  title: string
  subtitle?: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-lg font-semibold text-gray-900">{title}</span>
          {subtitle ? <span className="block text-sm text-gray-500">{subtitle}</span> : null}
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-gray-100 px-5 py-4 text-gray-700 leading-relaxed">{children}</div>
    </details>
  )
}

export default function LaereplanerPage() {
  return (
    <OmPage
      current="/laereplaner"
      title="Læreplaner"
      intro={
        <p>
          Kompetansemålene i de to læreplanene som brukes i norskopplæringen for voksne med norsk
          som andrespråk: modulene i NOR11-01 og språknivåene A1–B2 i læreplanen for voksne
          innvandrere. Målene er sitert fra læreplanene.
        </p>
      }
    >
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Moduler (NOR11-01)</h2>
        <p className="text-gray-600 mb-5">
          {NOR11_01.tittel}. Fire moduler med egen progresjon.{' '}
          <a href={NOR11_01.kilde} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Les læreplanen hos Udir
          </a>
        </p>
        <div className="space-y-3">
          {NOR11_01.moduler.map((modul, index) => (
            <Level
              key={modul.navn}
              title={modul.navn}
              subtitle={`${modul.mal.length} kompetansemål`}
              open={index === 0}
            >
              <ul className="list-disc pl-5 space-y-1.5">
                {modul.mal.map((mal) => (
                  <li key={mal}>{mal}</li>
                ))}
              </ul>
            </Level>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Språknivå (A1–B2)</h2>
        <p className="text-gray-600 mb-5">
          {NVI.tittel} (HK-dir). Målene er delt inn i lytte, lese, skrive og muntlig, og deltakeren
          kan være på ulike nivåer i ulike ferdigheter.{' '}
          <a href={NVI.kilde} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Les læreplanen hos HK-dir
          </a>
        </p>
        <div className="space-y-3">
          {NVI.nivaer.map((niva, index) => (
            <Level
              key={niva.niva}
              title={`Nivå ${niva.niva}`}
              subtitle={`${niva.ferdigheter.reduce((sum, f) => sum + f.mal.length, 0)} kompetansemål`}
              open={index === 0}
            >
              <p className="mb-4 italic text-gray-600">{niva.beskrivelse}</p>
              <div className="space-y-5">
                {niva.ferdigheter.map((ferdighet) => (
                  <div key={ferdighet.ferdighet}>
                    <h3 className="font-semibold text-gray-900 mb-1.5">{ferdighet.ferdighet}</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      {ferdighet.mal.map((mal) => (
                        <li key={mal}>{mal}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Level>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-gray-500">
        Planene sier ikke at en modul tilsvarer et bestemt språknivå. Modul 1 ligger omtrent på A1,
        modul 2 på A2 og så videre, men dette er en tilnærming.
      </p>
    </OmPage>
  )
}
