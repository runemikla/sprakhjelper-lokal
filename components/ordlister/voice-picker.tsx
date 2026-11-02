'use client'

import { useRef, useState } from 'react'
import { Check, Loader2, Volume2 } from 'lucide-react'
import { GEMINI_VOICES } from '@/lib/tts/gemini-voices'
import { cn } from '@/lib/utils'

const SAMPLE = 'Hei! Jeg heter Sara. I dag spiser jeg lunsj i kantinen.'

interface VoicePickerProps {
  value: string
  onChange: (voice: string) => void
  // Sentence to read in the preview. Falls back to a short sample.
  sample?: string
}

// Lets the teacher hear each Gemini voice and pick one for the list.
export function VoicePicker({ value, onChange, sample }: VoicePickerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, string>())
  const audio = useRef<HTMLAudioElement | null>(null)
  const text = sample?.trim() || SAMPLE

  async function play(voice: string) {
    onChange(voice)
    setError(null)
    audio.current?.pause()
    const key = `${voice}:${text}`
    let url = cache.current.get(key)
    if (!url) {
      setLoading(voice)
      try {
        const response = await fetch('/api/ordlister/lyd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        })
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || `Feil ${response.status}`)
        }
        url = URL.createObjectURL(await response.blob())
        cache.current.set(key, url)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunne ikke spille av stemmen.')
        return
      } finally {
        setLoading(null)
      }
    }
    audio.current = new Audio(url)
    void audio.current.play()
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GEMINI_VOICES.map((v) => {
          const selected = v.name === value
          return (
            <button
              key={v.name}
              type="button"
              onClick={() => void play(v.name)}
              aria-pressed={selected}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                selected
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              )}
            >
              {loading === v.name ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              ) : selected ? (
                <Check className="h-4 w-4 shrink-0 text-blue-600" />
              ) : (
                <Volume2 className="h-4 w-4 shrink-0 text-gray-400" />
              )}
              <span className="min-w-0">
                <span className="block font-semibold text-gray-900">{v.name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {v.gender}, {v.style}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500">
        Trykk på en stemme for å høre den og velge den. Prøvesetning: «{text}»
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
