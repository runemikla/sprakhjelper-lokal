'use client'

import { useEffect, useState } from 'react'

// The student's own choices for talking with a chatbot. Kept in the browser
// (localStorage) and used for every chatbot.

export type TalkMode = 'auto' | 'manual'

export interface TalkSettings {
  // auto: the microphone opens by itself and the answer is sent after a pause.
  // manual: tap the microphone to start, and again to send.
  mode: TalkMode
  // silence (ms) after speech before the answer is sent in auto mode
  pauseMs: number
  // playback speed of the chatbot's voice
  rate: number
  // hide the conversation and show only the voice view
  hideMessages: boolean
}

export const PAUSE_OPTIONS: { value: number; label: string }[] = [
  { value: 300, label: 'Send med én gang' },
  { value: 500, label: '0,5 sekunder' },
  { value: 1000, label: '1 sekund' },
  { value: 1500, label: '1,5 sekunder' },
  { value: 2000, label: '2 sekunder' },
  { value: 3000, label: '3 sekunder' },
]

export const RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.75, label: '0,75× (saktere)' },
  { value: 0.9, label: '0,9×' },
  { value: 1, label: '1×' },
  { value: 1.15, label: '1,15×' },
  { value: 1.3, label: '1,3× (raskere)' },
]

export const DEFAULT_SETTINGS: TalkSettings = {
  mode: 'auto',
  pauseMs: 1500,
  rate: 1,
  hideMessages: false,
}

const KEY = 'snakkebot:innstillinger'

function read(): TalkSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<TalkSettings>
    return {
      mode: parsed.mode === 'manual' ? 'manual' : 'auto',
      pauseMs: PAUSE_OPTIONS.some((o) => o.value === parsed.pauseMs) ? (parsed.pauseMs as number) : DEFAULT_SETTINGS.pauseMs,
      rate: RATE_OPTIONS.some((o) => o.value === parsed.rate) ? (parsed.rate as number) : DEFAULT_SETTINGS.rate,
      hideMessages: parsed.hideMessages === true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useTalkSettings(): [TalkSettings, (patch: Partial<TalkSettings>) => void] {
  const [settings, setSettings] = useState<TalkSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(read())
  }, [])

  function update(patch: Partial<TalkSettings>) {
    setSettings((current) => {
      const next = { ...current, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // The choice is just not remembered.
      }
      return next
    })
  }

  return [settings, update]
}
