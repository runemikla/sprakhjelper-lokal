'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SAMPLE_TEXT,
  ttsVoiceLabel,
  voiceShortName,
  voiceTypeLabel,
  type TtsVoice,
} from '@/lib/tts/voices'
import { setVoiceAvailable } from './actions'

interface VoiceBrowserProps {
  voices: TtsVoice[]
  chosenIds: string[]
  canEdit: boolean
}

type GenderFilter = 'alle' | 'kvinne' | 'mann'

function chipClass(active: boolean) {
  return `inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-vlfk-ink focus-within:ring-offset-1 ${
    active ? 'border-vlfk-ink bg-vlfk-ink text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-vlfk-ink'
  }`
}

export function VoiceBrowser({ voices, chosenIds, canEdit }: VoiceBrowserProps) {
  const router = useRouter()
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(chosenIds))
  const [type, setType] = useState<string>('alle')
  const [gender, setGender] = useState<GenderFilter>('alle')
  const [onlyChosen, setOnlyChosen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Samples already fetched in this visit; the browser also caches them.
  const samples = useRef(new Map<string, string>())
  const audio = useRef<HTMLAudioElement | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of voices) counts.set(v.type, (counts.get(v.type) ?? 0) + 1)
    return [...counts.entries()]
  }, [voices])

  const shown = voices.filter(
    (v) =>
      (type === 'alle' || v.type === type) &&
      (gender === 'alle' || v.gender === gender) &&
      (!onlyChosen || chosen.has(v.id))
  )
  const chosenVoices = voices.filter((v) => chosen.has(v.id))

  function stop() {
    audio.current?.pause()
    audio.current = null
    setPlaying(null)
  }

  async function play(voice: TtsVoice) {
    setError(null)
    if (playing === voice.id) {
      stop()
      return
    }
    stop()
    let url = samples.current.get(voice.id)
    if (!url) {
      setLoading(voice.id)
      try {
        const response = await fetch(`/api/stemmer/lydprove?voice=${encodeURIComponent(voice.id)}`)
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || `Feil ${response.status}`)
        }
        url = URL.createObjectURL(await response.blob())
        samples.current.set(voice.id, url)
      } catch (e) {
        setError(`${ttsVoiceLabel(voice)}: ${e instanceof Error ? e.message : 'Kunne ikke spille av stemmen.'}`)
        return
      } finally {
        setLoading(null)
      }
    }
    const element = new Audio(url)
    element.onended = () => setPlaying((current) => (current === voice.id ? null : current))
    audio.current = element
    setPlaying(voice.id)
    void element.play()
  }

  async function toggle(voice: TtsVoice) {
    setError(null)
    const available = !chosen.has(voice.id)
    if (!available && chosen.size <= 1) {
      setError('Minst én stemme må være tilgjengelig.')
      return
    }
    setSaving(voice.id)
    const result = await setVoiceAvailable({ googleName: voice.googleName, gender: voice.gender, available })
    setSaving(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setChosen((current) => {
      const next = new Set(current)
      if (available) next.add(voice.id)
      else next.delete(voice.id)
      return next
    })
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Tilgjengelig i verktøyene ({chosenVoices.length})</h2>
        <p className="mt-1 text-sm text-gray-600">
          Lærerne velger blant disse når de lager lytteøvinger, ordlister og snakkeboter. Innhold som
          allerede er laget, beholder stemmen sin. Endringen gjelder i løpet av et halvt minutt.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {chosenVoices.map((v) => (
            <span key={v.id} className="inline-flex items-center rounded-full bg-vlfk-lyseblaa/40 px-3 py-1 text-sm font-medium text-vlfk-ink">
              {ttsVoiceLabel(v)}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-gray-200 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Alle norske stemmer ({voices.length})</h2>
          <p className="text-sm text-gray-600">Lydprøve: «{SAMPLE_TEXT}»</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Stemmetype">
          {[['alle', voices.length] as [string, number], ...types].map(([t, count]) => (
            <label key={t} className={chipClass(type === t)}>
              <input type="radio" name="stemmetype" className="sr-only" checked={type === t} onChange={() => setType(t)} />
              {t === 'alle' ? 'Alle typer' : voiceTypeLabel(t)}
              <span className={type === t ? 'text-white/80' : 'text-gray-500'}>({count})</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Kjønn og utvalg">
          {(['alle', 'kvinne', 'mann'] as GenderFilter[]).map((g) => (
            <label key={g} className={chipClass(gender === g)}>
              <input type="radio" name="kjonn" className="sr-only" checked={gender === g} onChange={() => setGender(g)} />
              {g === 'alle' ? 'Alle stemmer' : g === 'kvinne' ? 'Kvinner' : 'Menn'}
            </label>
          ))}
          <label className={chipClass(onlyChosen)}>
            <input type="checkbox" className="sr-only" checked={onlyChosen} onChange={() => setOnlyChosen((v) => !v)} />
            Bare valgte
          </label>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600">
          Ingen stemmer passer med filteret.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200">
          {shown.map((v) => {
            const isChosen = chosen.has(v.id)
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void play(v)}
                  disabled={loading === v.id}
                  aria-label={playing === v.id ? `Stopp ${ttsVoiceLabel(v)}` : `Hør ${ttsVoiceLabel(v)}`}
                >
                  {loading === v.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : playing === v.id ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {v.type === 'Chirp3-HD' ? voiceShortName(v) : `${voiceTypeLabel(v.type)} ${voiceShortName(v)}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {[voiceTypeLabel(v.type), v.gender, v.style].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canEdit && (
                  <label className={`${chipClass(isChosen)} shrink-0`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isChosen}
                      disabled={saving !== null}
                      onChange={() => void toggle(v)}
                    />
                    {saving === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isChosen ? (
                      <Check className="h-4 w-4" />
                    ) : null}
                    {isChosen ? 'Tilgjengelig' : 'Gjør tilgjengelig'}
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
