'use client'

import { useEffect, useRef, useState } from 'react'

const PLAYBACK_RATES = [
  { value: 1, label: 'Normal' },
  { value: 0.85, label: 'Litt saktere' },
  { value: 0.7, label: 'Sakte' },
]

interface AudioPlayerProps {
  src: string
  label?: string
}

function suppressSafariEmptyRangesError() {
  if (typeof window === 'undefined') return

  const alreadyPatched = (
    window as Window & { __sprakhjelpEmptyRangesPatch?: boolean }
  ).__sprakhjelpEmptyRangesPatch
  if (alreadyPatched) return

  ;(
    window as Window & { __sprakhjelpEmptyRangesPatch?: boolean }
  ).__sprakhjelpEmptyRangesPatch = true

  // Safari media controls throw when a native <audio> element is collected.
  // https://bugs.webkit.org/show_bug.cgi?id=318284
  window.addEventListener(
    'error',
    (event) => {
      if (event.message?.includes('EmptyRanges')) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    },
    true
  )
}

function detachAudio(element: HTMLAudioElement) {
  element.pause()
  element.removeAttribute('src')
  element.load()
}

export function AudioPlayer({ src, label = 'Lytt til teksten' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    suppressSafariEmptyRangesError()
  }, [])

  useEffect(() => {
    const element = audioRef.current
    if (!element) return

    element.src = src
    element.load()

    return () => {
      detachAudio(element)
    }
  }, [src])

  useEffect(() => {
    const element = audioRef.current
    if (!element) return
    // load() resets playbackRate to defaultPlaybackRate, so set both.
    element.defaultPlaybackRate = playbackRate
    element.playbackRate = playbackRate
  }, [playbackRate])

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className="w-full"
        aria-label={label}
      >
        Nettleseren din støtter ikke lydavspilling.
      </audio>
      <div
        role="group"
        aria-label="Avspillingshastighet"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <span className="text-gray-700">Hastighet:</span>
        {PLAYBACK_RATES.map((rate) => (
          <button
            key={rate.value}
            type="button"
            onClick={() => setPlaybackRate(rate.value)}
            aria-pressed={playbackRate === rate.value}
            className={`rounded-full border px-3 py-1 transition-colors ${
              playbackRate === rate.value
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            {rate.label}
          </button>
        ))}
      </div>
    </div>
  )
}
