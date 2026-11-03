'use client'

import { useRef, useState } from 'react'
import { Loader2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CHOSEN_VOICES, GEMINI_VOICES, voiceLabel } from '@/lib/tts/gemini-voices'

const SAMPLE = 'Hei! Jeg heter Sara. I dag spiser jeg lunsj i kantinen.'

interface VoicePickerProps {
  value: string
  onChange: (voice: string) => void
  // Sentence to read in the preview. Falls back to a short sample.
  sample?: string
}

// Drop-down with the four chosen Gemini voices, and a button to hear the
// selected one. A list made earlier with another voice keeps it as an
// extra option, so its recordings are not made again by accident.
export function VoicePicker({ value, onChange, sample }: VoicePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, string>())
  const audio = useRef<HTMLAudioElement | null>(null)
  const text = sample?.trim() || SAMPLE

  const current = GEMINI_VOICES.find((v) => v.name === value)
  const options = CHOSEN_VOICES.some((v) => v.name === value) || !current ? CHOSEN_VOICES : [...CHOSEN_VOICES, current]

  async function play() {
    setError(null)
    audio.current?.pause()
    const key = `${value}:${text}`
    let url = cache.current.get(key)
    if (!url) {
      setLoading(true)
      try {
        const response = await fetch('/api/ordlister/lyd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: value }),
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
        setLoading(false)
      }
    }
    audio.current = new Audio(url)
    void audio.current.play()
  }

  return (
    <div className="space-y-2">
      <div className="flex max-w-md gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label="Stemme" className="h-10 w-full bg-white">
            <SelectValue placeholder="Velg stemme" />
          </SelectTrigger>
          <SelectContent>
            {options.map((v) => (
              <SelectItem key={v.name} value={v.name}>
                {voiceLabel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => void play()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          Hør
        </Button>
      </div>
      <p className="text-xs text-gray-500">Prøvesetning: «{text}»</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
