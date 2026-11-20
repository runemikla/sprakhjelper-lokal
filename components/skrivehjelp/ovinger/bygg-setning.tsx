'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WordBank } from '@/components/grammatikk/word-order/word-bank'
import { SentenceBuilder } from '@/components/grammatikk/word-order/sentence-builder'
import type { WordToken, Zone } from '@/components/grammatikk/word-order/types'
import { normaliser } from '@/lib/ovinger/valider'
import type { ByggSetningOving } from '@/lib/ovinger/types'
import { Tilbakemelding, type Svarstatus } from './tilbakemelding'

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
}

export function ByggSetning({ oving, onForsteSvar, onRiktig }: ByggSetningProps) {
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

  return (
    <div className="space-y-4">
      <SentenceBuilder
        tokens={setning}
        draggingId={draggingId}
        status={status === 'riktig' ? 'correct' : status === 'feil' ? 'wrong' : 'idle'}
        disabled={laast}
        prefix={oving.setningsstart || undefined}
        suffix={oving.slutttegn}
        onDragStart={(t) => {
          draggingIdRef.current = t.id
          setDraggingId(t.id)
        }}
        onDragEnd={() => {
          draggingIdRef.current = null
          setDraggingId(null)
        }}
        onDropToEnd={() => {
          if (draggingIdRef.current) flytt(draggingIdRef.current, 'sentence', null)
        }}
        onDropBefore={(t) => {
          const id = draggingIdRef.current
          if (id && id !== t.id) flytt(id, 'sentence', t.id)
        }}
        onChipClick={(t, fra) => flytt(t.id, fra === 'bank' ? 'sentence' : 'bank', null)}
      />

      <WordBank
        tokens={bank}
        draggingId={draggingId}
        disabled={laast}
        onDragStart={(t) => {
          draggingIdRef.current = t.id
          setDraggingId(t.id)
        }}
        onDragEnd={() => {
          draggingIdRef.current = null
          setDraggingId(null)
        }}
        onDropToBank={() => {
          if (draggingIdRef.current) flytt(draggingIdRef.current, 'bank', null)
        }}
        onChipClick={(t, fra) => flytt(t.id, fra === 'bank' ? 'sentence' : 'bank', null)}
      />

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
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Fasit: <span className="font-semibold">{fasit}</span>
          </span>
        </div>
      )}

      {!laast && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={sjekk} disabled={setning.length === 0}>
            Sjekk svar
          </Button>
          {harSvart && (
            <Button variant="outline" onClick={() => setVisFasit((v) => !v)}>
              <Eye className="h-4 w-4" />
              {visFasit ? 'Skjul fasit' : 'Vis fasit'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
