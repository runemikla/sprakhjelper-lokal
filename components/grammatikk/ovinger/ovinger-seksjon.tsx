'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Play, RotateCcw, Sparkles } from 'lucide-react'
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
  // Sier fra når eleven starter eller går ut av øvingene, slik at siden kan
  // skjule alt annet mens eleven jobber.
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
  const [lost, setLost] = useState(false)
  const [forsteForsok, setForsteForsok] = useState<boolean[]>([])
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

  useEffect(() => {
    onStartetEndret?.(startet)
  }, [startet, onStartetEndret])

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
      setLost(false)
      setForsteForsok([])
      setRunde((r) => r + 1)
    } catch (err) {
      setFeilmelding(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLaster(false)
    }
  }

  const startPaaNytt = () => {
    setIndeks(0)
    setLost(false)
    setForsteForsok([])
    setRunde((r) => r + 1)
  }

  const neste = () => {
    setIndeks((i) => i + 1)
    setLost(false)
  }

  const ovinger = resultat?.ovinger ?? []
  const ferdig = resultat !== null && ovinger.length > 0 && indeks >= ovinger.length
  const oving = ovinger[indeks]
  const valgteKoder = new Set(resultat?.valgte_feiltyper.map((v) => v.kode))
  const andreFeil = resultat?.feil.filter((f) => !valgteKoder.has(f.kode)) ?? []
  const antallRiktige = forsteForsok.filter(Boolean).length

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
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
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
          <Button onClick={generer} className="bg-blue-600 hover:bg-blue-700">
            <Sparkles className="h-4 w-4" />
            Generer øvingsoppgaver
          </Button>
        </div>
      )}

      {!laster && resultat && (
        <div className="space-y-6">
          {resultat.valgte_feiltyper.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
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
                        <div key={v.kode} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
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
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={ovinger.length === 0}
                    >
                      <Play className="h-4 w-4" />
                      Start øvingene ({ovinger.length} oppgaver)
                    </Button>
                  </div>
                </div>
              )}

              {/* Øvingene, én om gangen */}
              {startet && !ferdig && oving && (
                <div className="rounded-xl border-2 border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-blue-600">
                      Oppgave {indeks + 1} av {ovinger.length}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{finnFeiltype(oving.kode)?.navn ?? oving.kode}</Badge>
                      {oving.fra_elevteksten && <Badge variant="outline">Fra teksten din</Badge>}
                    </div>
                  </div>
                  <div
                    className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(indeks / ovinger.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="mb-4 font-medium text-gray-900">{oving.instruksjon}</p>

                      {oving.format === 'bygg_setning' ? (
                        <ByggSetning
                          key={`${runde}-${indeks}`}
                          oving={oving}
                          onForsteSvar={(r) => setForsteForsok((f) => [...f, r])}
                          onRiktig={() => setLost(true)}
                          onStatus={oppdaterStatus}
                        />
                      ) : (
                        <VelgOrd
                          key={`${runde}-${indeks}`}
                          oving={oving}
                          onForsteSvar={(r) => setForsteForsok((f) => [...f, r])}
                          onRiktig={() => setLost(true)}
                          onStatus={oppdaterStatus}
                        />
                      )}
                    </div>
                    <div className="flex shrink-0 justify-center sm:w-36">
                      <Image
                        src={`/images/${laerer}_${svarstatus === 'riktig' ? 'riktig' : 'feil'}.png`}
                        alt="Lærer"
                        width={144}
                        height={144}
                        className="h-28 w-28 object-contain sm:h-36 sm:w-36"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    {!lost && (
                      <Button variant="ghost" onClick={neste}>
                        Hopp over
                      </Button>
                    )}
                    {lost && (
                      <Button onClick={neste}>
                        {indeks + 1 < ovinger.length ? 'Neste oppgave' : 'Se resultatet'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
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
                    className="mx-auto h-32 w-32 object-contain"
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
                    <Button onClick={generer} className="bg-blue-600 hover:bg-blue-700">
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
