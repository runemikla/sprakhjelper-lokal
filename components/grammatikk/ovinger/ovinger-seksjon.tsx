'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Flag, Play, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingAnimation } from '@/components/ui/loading-animation'
import { cn } from '@/lib/utils'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { NIVAAER, finnFeiltype, type Nivaa } from '@/lib/ovinger/feiltyper'
import type { OvingerResultat } from '@/lib/ovinger/types'
import { ByggSetning } from './bygg-setning'
import { VelgOrd } from './velg-ord'
import type { Svarstatus } from './tilbakemelding'

const NIVAA_TEKST: Record<Nivaa, string> = {
  A1: 'Nybegynner',
  A2: 'Litt øvet',
  B1: 'Øvet',
  B2: 'Godt øvet',
}

interface OvingerSeksjonProps {
  originalText: string
  morsmaal: string
  morsmaalNavn: string
  morsmaalFlagg?: string
  // Setningene slik Skrivehjelp har rettet dem.
  setninger: { elev: string; rettet: string }[]
  // Sier fra når eleven jobber med oppgavene (startet og ikke ferdig), slik at
  // siden kan skjule alt annet og gi panelet fast høyde.
  onStartetEndret?: (startet: boolean) => void
}

// «Øv på feilene dine» under Grammatikkøving (/grammatikk/ov-pa-feilene), med
// teksten eleven tok med fra Skrivehjelp: språkmodellen finner feilene i
// teksten, velger 1–3 feiltyper og lager øvinger til dem.
export function OvingerSeksjon({
  originalText,
  morsmaal,
  morsmaalNavn,
  morsmaalFlagg,
  setninger,
  onStartetEndret,
}: OvingerSeksjonProps) {
  const [nivaa, setNivaa] = useState<Nivaa>('A2')
  const [laster, setLaster] = useState(false)
  const [feilmelding, setFeilmelding] = useState<string | null>(null)
  const [resultat, setResultat] = useState<OvingerResultat | null>(null)
  const [indeks, setIndeks] = useState(0)
  // Per oppgave (indeks): løst, og om første forsøk var riktig.
  const [loste, setLoste] = useState<Record<number, boolean>>({})
  const [forsteForsok, setForsteForsok] = useState<Record<number, boolean>>({})
  const [paaNorsk, setPaaNorsk] = useState(true)
  // Eleven ser først oversikten over hva hen skal øve på, og trykker Start.
  const [startet, setStartet] = useState(false)
  // Samme lærere som i Ordrekkefølge: én tilfeldig lærer per besøk, og bildet
  // viser glad lærer når svaret er riktig.
  const [laerer, setLaerer] = useState<'gunhild' | 'jonas'>('gunhild')
  const [svarstatus, setSvarstatus] = useState<Svarstatus>('idle')

  useEffect(() => {
    setLaerer(Math.random() < 0.5 ? 'gunhild' : 'jonas')
  }, [])


  const oppdaterStatus = useCallback((status: Svarstatus) => setSvarstatus(status), [])
  // Ny nøkkel per runde, slik at øvingene starter på nytt.
  const [runde, setRunde] = useState(0)

  const generer = async () => {
    setLaster(true)
    setFeilmelding(null)
    try {
      const response = await fetchWithTimeout(
        '/api/generate-exercises',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalText, morsmaal, nivaa, setninger }),
        },
        120000
      )
      if (response.status === 429) {
        throw new Error('Du har laget mange øvinger på kort tid. Vent ett minutt og prøv igjen.')
      }
      if (!response.ok) {
        throw new Error('Kunne ikke lage øvinger. Prøv igjen.')
      }
      const data = (await response.json()) as OvingerResultat & { success: boolean }
      setResultat(data)
      setStartet(false)
      setIndeks(0)
      setLoste({})
      setForsteForsok({})
      setRunde((r) => r + 1)
    } catch (err) {
      setFeilmelding(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  const startPaaNytt = () => {
    setIndeks(0)
    setLoste({})
    setForsteForsok({})
    setRunde((r) => r + 1)
  }

  const neste = () => setIndeks((i) => i + 1)
  const forrige = () => setIndeks((i) => Math.max(0, i - 1))

  const ovinger = resultat?.ovinger ?? []
  const ferdig = resultat !== null && ovinger.length > 0 && indeks >= ovinger.length
  const oving = ovinger[indeks]
  const valgteKoder = new Set(resultat?.valgte_feiltyper.map((v) => v.kode))
  const andreFeil = resultat?.feil.filter((f) => !valgteKoder.has(f.kode)) ?? []
  const antallRiktige = Object.values(forsteForsok).filter(Boolean).length
  const jobber = startet && !ferdig && Boolean(oving)

  useEffect(() => {
    onStartetEndret?.(jobber)
  }, [jobber, onStartetEndret])

  // Oppgavene, én om gangen, bygd opp som setningsvisningen i Skrivehjelp:
  // innholdet kan rulle, fremdrift og navigasjon står fast nederst.
  if (!laster && jobber && oving) {
    const lost = Boolean(loste[indeks])
    const siste = indeks + 1 >= ovinger.length
    const felles = {
      oving,
      onForsteSvar: (r: boolean) =>
        setForsteForsok((f) => (indeks in f ? f : { ...f, [indeks]: r })),
      onRiktig: () => setLoste((l) => ({ ...l, [indeks]: true })),
      onStatus: oppdaterStatus,
      merker: (
        <>
          <Badge variant="secondary">{finnFeiltype(oving.kode)?.navn ?? oving.kode}</Badge>
          {oving.fra_elevteksten && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Fra teksten din
            </Badge>
          )}
        </>
      ),
      bilde: (
        <Image
          src={`/images/${laerer}_${svarstatus === 'riktig' ? 'riktig' : 'feil'}.png`}
          alt="Lærer"
          width={192}
          height={192}
          className="h-48 w-48 object-contain"
          priority
        />
      ),
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          {oving.format === 'bygg_setning' ? (
            <ByggSetning key={`${runde}-${indeks}`} {...felles} oving={oving} />
          ) : (
            <VelgOrd key={`${runde}-${indeks}`} {...felles} oving={oving} />
          )}
        </div>

        <div className="mt-3 space-y-2 sm:mt-6 sm:space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
            <div
              className="h-full bg-vlfk-ink transition-all duration-300 ease-out"
              style={{ width: `${((indeks + 1) / ovinger.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={forrige}
              disabled={indeks === 0}
              aria-label="Forrige"
              title="Forrige"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Forrige</span>
            </Button>
            <span className="text-sm text-gray-500">
              Oppgave {indeks + 1} av {ovinger.length}
            </span>
            <Button
              variant={lost ? 'default' : 'outline'}
              onClick={neste}
              aria-label={siste ? 'Se resultatet' : 'Neste'}
              title={siste ? 'Se resultatet' : 'Neste'}
            >
              {siste ? <Flag className="h-4 w-4 sm:mr-2" /> : null}
              <span className="hidden sm:inline">{siste ? 'Se resultatet' : 'Neste'}</span>
              {siste ? null : <ChevronRight className="h-4 w-4 sm:ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {laster && <LoadingAnimation isVisible={true} />}

      {!laster && !resultat && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Få øvinger som passer til feilene i teksten din. Velg nivået ditt først.
          </p>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Hvilket nivå er du på?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Nivå">
              {NIVAAER.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={nivaa === n}
                  onClick={() => setNivaa(n)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-2 text-left transition-colors',
                    nivaa === n
                      ? 'border-vlfk-ink bg-vlfk-lyseblaa/15'
                      : 'border-gray-200 bg-white hover:border-vlfk-lyseblaa'
                  )}
                >
                  <span className="block font-semibold text-gray-900">{n}</span>
                  <span className="block text-xs text-gray-600">{NIVAA_TEKST[n]}</span>
                </button>
              ))}
            </div>
          </div>
          {feilmelding && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {feilmelding}
            </p>
          )}
          <Button onClick={generer}>
            <Sparkles className="h-4 w-4" />
            Generer øvingsoppgaver
          </Button>
        </div>
      )}

      {!laster && resultat && (
        <div className="space-y-6">
          {resultat.valgte_feiltyper.length === 0 ? (
            <div className="rounded-lg border border-vlfk-lyseblaa bg-vlfk-lyseblaa/15 p-6 text-center">
              <p className="text-sm text-gray-700">
                🎉 Vi fant ingen feil du trenger å øve på i denne teksten. Godt skrevet!
              </p>
            </div>
          ) : (
            <>
              {/* Hva eleven skal øve på, før øvingene starter */}
              {!startet && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-md font-semibold">Dette skal du øve på først</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={paaNorsk ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaaNorsk(true)}
                      >
                        <span className="mr-1">🇳🇴</span>
                        Norsk
                      </Button>
                      <Button
                        variant={!paaNorsk ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaaNorsk(false)}
                      >
                        <span className="mr-1">{morsmaalFlagg ?? '🌐'}</span>
                        {morsmaalNavn}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {resultat.valgte_feiltyper.map((v) => {
                      const eksempler = resultat.feil.filter((f) => f.kode === v.kode).slice(0, 3)
                      return (
                        <div key={v.kode} className="rounded-lg border border-vlfk-lyseblaa bg-vlfk-lyseblaa/15 p-4">
                          <p className="font-semibold text-gray-900">{v.navn}</p>
                          <p className="mt-1 text-sm text-gray-800">
                            {paaNorsk ? v.regel : v.regel_morsmaal || v.regel}
                          </p>
                          {eksempler.length > 0 && (
                            <ul className="mt-3 space-y-1 text-sm">
                              {eksempler.map((f, i) => (
                                <li key={i} className="flex flex-wrap gap-x-2">
                                  <span className="text-red-600 line-through">{f.utdrag}</span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-medium text-green-700">{f.rettet}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button
                      size="lg"
                      onClick={() => setStartet(true)}
                     
                      disabled={ovinger.length === 0}
                    >
                      <Play className="h-4 w-4" />
                      Start øvingene ({ovinger.length} oppgaver)
                    </Button>
                  </div>
                </div>
              )}

              {startet && ferdig && (
                <div className="space-y-4 rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center">
                  <Image
                    src={`/images/${laerer}_riktig.png`}
                    alt="Lærer"
                    width={144}
                    height={144}
                    className="mx-auto hidden h-32 w-32 object-contain sm:block"
                  />
                  <p className="text-lg font-semibold text-green-900">Ferdig!</p>
                  <p className="text-sm text-green-900">
                    Du fikk {antallRiktige} av {ovinger.length} riktig på første forsøk.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" onClick={startPaaNytt}>
                      <RotateCcw className="h-4 w-4" />
                      Gjør de samme øvingene igjen
                    </Button>
                    <Button onClick={generer}>
                      <Sparkles className="h-4 w-4" />
                      Lag nye øvinger
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!startet && andreFeil.length > 0 && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Se også: andre feil i teksten ({andreFeil.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {andreFeil.map((f, i) => (
                  <li key={i}>
                    <span className="text-red-600 line-through">{f.utdrag}</span>
                    <span className="mx-2 text-gray-500">→</span>
                    <span className="font-medium text-green-700">{f.rettet}</span>
                    {f.forklaring && <span className="block text-gray-600">{f.forklaring}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {feilmelding && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {feilmelding}
            </p>
          )}

          {(!startet || ferdig) && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setResultat(null)
                  setStartet(false)
                }}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Velg et annet nivå
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
