'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_AVAILABLE_VOICES, defaultVoiceOf, type TtsVoice } from './voices'

// The voices the admin has made available (page /stemmer), for the voice
// pickers. Starts with the four default voices and fetches the list once
// per page load.

interface AvailableVoices {
  voices: TtsVoice[]
  defaultVoice: string
  loaded: boolean
}

let request: Promise<{ voices: TtsVoice[]; defaultVoice: string }> | null = null

function fetchVoices() {
  request ??= fetch('/api/stemmer')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((body: { voices?: TtsVoice[]; defaultVoice?: string }) => {
      const voices = body.voices?.length ? body.voices : DEFAULT_AVAILABLE_VOICES
      return { voices, defaultVoice: body.defaultVoice ?? defaultVoiceOf(voices) }
    })
    .catch(() => {
      request = null
      return { voices: DEFAULT_AVAILABLE_VOICES, defaultVoice: defaultVoiceOf(DEFAULT_AVAILABLE_VOICES) }
    })
  return request
}

export function useAvailableVoices(): AvailableVoices {
  const [state, setState] = useState<AvailableVoices>({
    voices: DEFAULT_AVAILABLE_VOICES,
    defaultVoice: defaultVoiceOf(DEFAULT_AVAILABLE_VOICES),
    loaded: false,
  })
  useEffect(() => {
    let active = true
    void fetchVoices().then((result) => {
      if (active) setState({ ...result, loaded: true })
    })
    return () => {
      active = false
    }
  }, [])
  return state
}
