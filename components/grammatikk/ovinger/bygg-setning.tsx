'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WordBank } from '@/components/grammatikk/word-order/word-bank'
import { SentenceBuilder } from '@/components/grammatikk/word-order/sentence-builder'
import type { WordToken, Zone } from '@/components/grammatikk/word-order/types'
import { normaliser } from '@/lib/ovinger/valider'
import type { ByggSetningOving } from '@/lib/ovinger/types'
import { Tilbakemelding, type Svarstatus } from './tilbakemelding'
import { OVERSKRIFT, OppgaveTopp } from './oppgave-oppsett'

// Blander ordene slik at rekkefølgen aldri er den riktige fra start.
function blandOrd(ord: string[]): string[] {
  if (ord.length <= 1) return [...ord]
  for (let forsok = 0; forsok < 10; forsok++) {
    const blandet = [...ord]
    for (let i = blandet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[blandet[i], blandet[j]] = [blandet[j], blandet[i]]
    }
    if (normaliser(blandet.join(' ')) !== normaliser(ord.join(' '))) return blandet
  }
  return [...ord].reverse()
}

interface ByggSetningProps {
  oving: ByggSetningOving
  // Kalles første gang eleven sjekker svaret.
  onForsteSvar: (riktig: boolean) => void
  onRiktig: () => void
  // Kalles hver gang svarstatusen endres (brukes til lærerbildet).
  onStatus?: (status: Svarstatus) => void
  merker?: ReactNode
  bilde?: ReactNode
}

export function ByggSetning({ oving, onForsteSvar, onRiktig, onStatus, merker, bilde }: ByggSetningProps) {
  const startOrd = useMemo<WordToken[]>(
    () => blandOrd(oving.ord).map((text) => ({ id: crypto.randomUUID(), text })),
    [oving]
  )
  const [bank, setBank] = useState<WordToken[]>(startOrd)
  const [setning, setSetning] = useState<WordToken[]>([])
  const [status, setStatus] = useState<Svarstatus>('idle')
  const [harSvart, setHarSvart] = useState(false)
  const [visFasit, setVisFasit] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    onStatus?.(status)
  }, [status, onStatus])
  const draggingIdRef = useRef<string | null>(null)

  const flytt = useCallback(
    (id: string, til: Zone, foerId: string | null) => {
      if (status === 'riktig') return
      const alle = [...bank, ...setning]
      const token = alle.find((t) => t.id === id)
      if (!token) return
      const nyBank = bank.filter((t) => t.id !== id)
      const nySetning = setning.filter((t) => t.id !== id)
      const maal = til === 'bank' ? nyBank : nySetning
      const idx = foerId ? maal.findIndex((t) => t.id === foerId) : -1
      if (idx >= 0) maal.splice(idx, 0, token)
      else maal.push(token)
      setBank(nyBank)
      setSetning(nySetning)
      setStatus('idle')
    },
    [bank, setning, status]
  )

  const sjekk = () => {
    const svar = normaliser(setning.map((t) => t.text).join(' '))
    const riktige = [oving.ord, ...oving.andre_riktige].map((o) => normaliser(o.join(' ')))
    const erRiktig = bank.length === 0 && riktige.includes(svar)
    setStatus(erRiktig ? 'riktig' : 'feil')
    if (!harSvart) {
      setHarSvart(true)
      onForsteSvar(erRiktig)
    }
    if (erRiktig) onRiktig()
  }

  const fasit = [oving.setningsstart, oving.ord.join(' ')].filter(Boolean).join(' ') + oving.slutttegn
  const laast = status === 'riktig'

  const dra = {
    onDragStart: (t: WordToken) => {
      draggingIdRef.current = t.id
      setDraggingId(t.id)
    },
    onDragEnd: () => {
      draggingIdRef.current = null
      setDraggingId(null)
    },
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <OppgaveTopp merker={merker} bilde={bilde}>
        <SentenceBuilder
          hideLabel
          tokens={setning}
          draggingId={draggingId}
          status={status === 'riktig' ? 'correct' : status === 'feil' ? 'wrong' : 'idle'}
          disabled={laast}
          prefix={oving.setningsstart || undefined}
          suffix={oving.slutttegn}
          {...dra}
          onDropToEnd={() => {
            if (draggingIdRef.current) flytt(draggingIdRef.current, 'sentence', null)
          }}
          onDropBefore={(t) => {
            const id = draggingIdRef.current
            if (id && id !== t.id) flytt(id, 'sentence', t.id)
          }}
          onChipClick={(t, fra) => flytt(t.id, fra === 'bank' ? 'sentence' : 'bank', null)}
        />
        {/* Instruction and buttons under the sentence, as in Skrivehjelp */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 sm:mt-3">
          <p className="text-sm text-gray-600">{oving.instruksjon}</p>
          {!laast && (
            <div className="flex shrink-0 gap-2">
              {harSvart && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisFasit((v) => !v)}
                  aria-label={visFasit ? 'Skjul fasit' : 'Vis fasit'}
                  title={visFasit ? 'Skjul fasit' : 'Vis fasit'}
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">{visFasit ? 'Skjul fasit' : 'Vis fasit'}</span>
                </Button>
              )}
              <Button size="sm" onClick={sjekk} disabled={setning.length === 0}>
                <Check className="h-4 w-4" />
                Sjekk svar
              </Button>
            </div>
          )}
        </div>
      </OppgaveTopp>

      <div className="space-y-1 sm:space-y-2">
        <h3 className={OVERSKRIFT}>Ordbank:</h3>
        <WordBank
          hideLabel
          tokens={bank}
          draggingId={draggingId}
          disabled={laast}
          {...dra}
          onDropToBank={() => {
            if (draggingIdRef.current) flytt(draggingIdRef.current, 'bank', null)
          }}
          onChipClick={(t, fra) => flytt(t.id, fra === 'bank' ? 'sentence' : 'bank', null)}
        />
      </div>

      <Tilbakemelding
        status={status}
        forklaring={oving.forklaring}
        feilTekst={
          bank.length > 0
            ? 'Bruk alle ordene i ordbanken.'
            : 'Ikke helt riktig ennå. Prøv å flytte på ordene.'
        }
      />

      {visFasit && (
        <div className="flex items-start gap-2 rounded-lg border border-vlfk-lyseblaa bg-vlfk-lyseblaa/15 p-3 text-sm text-vlfk-ink sm:p-4">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Fasit: <span className="font-semibold">{fasit}</span>
          </span>
        </div>
      )}
    </div>
  )
}
