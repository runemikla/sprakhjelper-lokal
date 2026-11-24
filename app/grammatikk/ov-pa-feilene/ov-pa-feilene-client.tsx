'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { FjordPageShell } from '@/components/landing/fjord-page-shell'
import { PageHeader } from '@/components/landing/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OvingerSeksjon } from '@/components/grammatikk/ovinger/ovinger-seksjon'
import { cn } from '@/lib/utils'
import { hentTekstForOvinger, type TekstForOvinger } from '@/lib/ovinger/fra-skrivehjelp'

interface Props {
  userEmail: string | null
  isAdmin: boolean
}

export default function OvPaFeileneClient({ userEmail, isAdmin }: Props) {
  // undefined = ikke lest ennå (sessionStorage finnes bare i nettleseren).
  const [tekst, setTekst] = useState<TekstForOvinger | null | undefined>(undefined)
  // Mens eleven jobber med oppgavene, vises bare oppgavene.
  const [jobber, setJobber] = useState(false)

  useEffect(() => {
    setTekst(hentTekstForOvinger())
  }, [])

  return (
    <FjordPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        backHref="/grammatikk"
        backLabel="Tilbake til temaene"
        title="Øv på feilene dine"
        description="Øvinger laget ut fra feilene i teksten du skrev i Skrivehjelp."
        compact={jobber}
        className={cn('px-2 sm:px-0', !jobber && 'mb-8')}
      />

      {/* Mens eleven jobber har panelet fast høyde, som i Skrivehjelp, slik at
          det ikke hopper mellom oppgaver eller når tilbakemeldingen vises. */}
      <Card
        className={cn(
          'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl',
          jobber && 'flex h-[calc(100dvh-13rem)] flex-col sm:h-[calc(100dvh-17rem)]'
        )}
      >
        <CardContent
          className={cn('pt-6', jobber && 'flex flex-1 flex-col overflow-hidden p-3 sm:p-6')}
        >
          {tekst === undefined ? null : tekst ? (
            <div className={cn(jobber ? 'flex min-h-0 flex-1 flex-col' : 'space-y-6')}>
              {!jobber && (
                <details className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700">Teksten din</summary>
                  <p className="mt-3 whitespace-pre-wrap leading-relaxed text-gray-800">
                    {tekst.originalText}
                  </p>
                </details>
              )}
              <OvingerSeksjon
                originalText={tekst.originalText}
                morsmaal={tekst.morsmaal}
                morsmaalNavn={tekst.morsmaalNavn}
                morsmaalFlagg={tekst.morsmaalFlagg}
                setninger={tekst.setninger}
                onStartetEndret={setJobber}
              />
            </div>
          ) : (
            <div className="space-y-4 py-4 text-center">
              <p className="text-gray-700">
                Skriv en tekst i Skrivehjelp først. Når du har fått tilbakemelding, trykker du på
                «Øv på feilene dine» i sammendraget, så kommer du hit med teksten din.
              </p>
              <Button asChild>
                <Link href="/spraakhjelper">
                  <PenLine className="h-4 w-4" />
                  Gå til Skrivehjelp
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </FjordPageShell>
  )
}
