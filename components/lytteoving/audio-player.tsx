'use client'

import { useEffect, useRef } from 'react'

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
    </div>
  )
}
