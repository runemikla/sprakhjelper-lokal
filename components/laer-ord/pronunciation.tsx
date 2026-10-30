'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Image from 'next/image'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Word } from '@/lib/laer-ord/data'

// "w" plays the word itself, "s" plays the example sentence.
export type SoundKind = 'w' | 's'

interface PronunciationContextValue {
  play: (word: Word, kind: SoundKind, options?: { slow?: boolean }) => void
  // `${word.id}:${kind}` of the recording that is playing right now.
  playing: string | null
}

const PronunciationContext = createContext<PronunciationContextValue | null>(null)

export function usePronunciation() {
  const context = useContext(PronunciationContext)
  if (!context) {
    throw new Error('usePronunciation must be used inside PronunciationProvider')
  }
  return context
}

// Removes the [brackets] that mark the target word in an example sentence.
export const plainSentence = (sentence: string) => sentence.replace(/[[\]]/g, '')

/**
 * Plays the recorded mp3 files for each word and sentence. If a recording
 * cannot be played, the browser's own Norwegian voice is used as a fallback.
 */
export function PronunciationProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const speakWithBrowser = useCallback((text: string, slow: boolean) => {
    if (!('speechSynthesis' in globalThis)) return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nb-NO'
    utterance.rate = slow ? 0.6 : 0.9
    const voice = speechSynthesis
      .getVoices()
      .find((v) => /^(nb|no|nn)/i.test(v.lang))
    if (voice) utterance.voice = voice
    speechSynthesis.speak(utterance)
  }, [])

  const play = useCallback(
    (word: Word, kind: SoundKind, options?: { slow?: boolean }) => {
      const slow = options?.slow ?? false
      const key = `${word.id}:${kind}`
      audioRef.current?.pause()

      const audio = new Audio(`/laer-ord/lyd/${word.id}${kind === 's' ? '-s' : ''}.mp3`)
      audio.preservesPitch = true
      audio.playbackRate = slow ? 0.7 : 1
      audio.onended = () => setPlaying((current) => (current === key ? null : current))
      audioRef.current = audio
      setPlaying(key)

      audio.play().catch(() => {
        setPlaying(null)
        speakWithBrowser(kind === 's' ? plainSentence(word.s) : word.ord, slow)
      })
    },
    [speakWithBrowser]
  )

  const value = useMemo(() => ({ play, playing }), [play, playing])

  return (
    <PronunciationContext.Provider value={value}>{children}</PronunciationContext.Provider>
  )
}

interface SayWordProps {
  word: Word
  className?: string
}

// The word as a button: click it to hear the pronunciation.
export function SayWord({ word, className }: SayWordProps) {
  const { play, playing } = usePronunciation()
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        play(word, 'w')
      }}
      className={cn(
        'border-b-2 border-dotted border-blue-500 font-semibold hover:text-blue-600',
        playing === `${word.id}:w` && 'rounded bg-blue-100',
        className
      )}
    >
      {word.ord}
    </button>
  )
}

// Example sentence with the target word in bold, followed by a "Hør" button.
export function Sentence({ word }: { word: Word }) {
  const { play, playing } = usePronunciation()
  const match = /^(.*?)\[(.+?)\](.*)$/.exec(word.s)
  const isPlaying = playing === `${word.id}:s`

  return (
    <span>
      {match ? (
        <>
          {match[1]}
          <b className="text-blue-700">{match[2]}</b>
          {match[3]}
        </>
      ) : (
        word.s
      )}{' '}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          play(word, 's')
        }}
        aria-label="Hør setningen"
        className={cn(
          'ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 py-0.5 align-middle text-xs font-medium text-blue-600 hover:border-blue-400',
          isPlaying && 'bg-blue-100'
        )}
      >
        <Volume2 className="h-3 w-3" aria-hidden="true" />
        Hør
      </button>
    </span>
  )
}

interface WordImageProps {
  word: Word
  alt?: string
  className?: string
  sizes?: string
}

export function WordImage({ word, alt = '', className, sizes = '300px' }: WordImageProps) {
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-lg bg-white', className)}>
      <Image
        src={`/laer-ord/img/${word.id}.webp`}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain"
      />
    </div>
  )
}
