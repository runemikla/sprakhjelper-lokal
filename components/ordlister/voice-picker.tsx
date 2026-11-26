'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { describeVoice, googleNameOf, isValidVoiceId, ttsVoiceLabel, type TtsVoice } from '@/lib/tts/voices'
import { useAvailableVoices } from '@/lib/tts/use-available-voices'

const SAMPLE = 'Hei! Jeg heter Sara. I dag spiser jeg lunsj i kantinen.'

interface VoicePickerProps {
  value: string
  onChange: (voice: string) => void
  // Sentence to read in the preview. Falls back to a short sample.
  sample?: string
  // Which voices to preview: Gemini (word lists) or Google Cloud Chirp 3 HD
  // (Snakkebot). The four chosen voices have the same names in both.
  provider?: 'gemini' | 'google'
  // New content: switch to the default voice if the current one is not
  // available any more.
  isNew?: boolean
}

/**
 * The voices the admin has made available (page /stemmer). Content made
 * earlier with another voice keeps it as an extra option, so its recordings
 * are not made again by accident. New content with a voice that is not
 * available is moved to the default voice.
 */
export function useVoiceOptions(value: string, onChange: (voice: string) => void, isNew = false): TtsVoice[] {
  const { voices, defaultVoice, loaded } = useAvailableVoices()
  const available = voices.some((v) => v.id === value)

  useEffect(() => {
    if (loaded && isNew && !available && value !== defaultVoice) onChange(defaultVoice)
  }, [loaded, isNew, available, value, defaultVoice, onChange])

  if (available || !isValidVoiceId(value)) return voices
  return [...voices, describeVoice(googleNameOf(value))]
}

// Drop-down with the voices the admin has made available, and a button to
// hear the selected one.
export function VoicePicker({ value, onChange, sample, provider, isNew }: VoicePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, string>())
  const audio = useRef<HTMLAudioElement | null>(null)
  const text = sample?.trim() || SAMPLE

  const options = useVoiceOptions(value, onChange, isNew)

  async function play() {
    setError(null)
    audio.current?.pause()
    const key = `${provider ?? 'standard'}:${value}:${text}`
    let url = cache.current.get(key)
    if (!url) {
      setLoading(true)
      try {
        const response = await fetch('/api/ordlister/lyd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: value, provider }),
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
              <SelectItem key={v.id} value={v.id}>
                {ttsVoiceLabel(v)}
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
