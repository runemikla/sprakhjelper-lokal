'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Dumbbell, PenLine } from 'lucide-react'
import { FjordPageShell } from '@/components/landing/fjord-page-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OvingerSeksjon } from '@/components/grammatikk/ovinger/ovinger-seksjon'
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
    <FjordPageShell userEmail={userEmail} isAdmin={isAdmin} maxWidth="max-w-3xl">
      <Link
        href="/grammatikk"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til temaene
      </Link>

      <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-white drop-shadow">
        <Dumbbell className="h-7 w-7" />
        Øv på feilene dine
      </h1>
      <p className="mb-8 text-white/90 drop-shadow">
        Øvinger laget ut fra feilene i teksten du skrev i Skrivehjelp.
      </p>

      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardContent className="pt-6">
          {tekst === undefined ? null : tekst ? (
            <div className="space-y-6">
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
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
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
