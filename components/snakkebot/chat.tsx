'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Mic, Pencil, RotateCcw, Send, Settings2, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { SettingsPanel } from '@/components/snakkebot/settings-panel'
import { isRecordingSupported, MicInput, WavRecorder } from '@/lib/snakkebot/recorder'
import { useTalkSettings } from '@/lib/snakkebot/settings'
import { LIMITS, refQuery, type ChatbotRef, type PublicChatbot } from '@/lib/snakkebot/types'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  // recording of an assistant message, once it has been read aloud
  audioUrl?: string
}

type Phase = 'start' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

// In «Automatisk» the microphone closes again if nothing is said for this long.
const AUTO_NO_SPEECH_MS = 20_000

// A very short silent WAV, played on the first tap so that iOS lets the page
// play the answers later without another tap.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

async function errorText(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error || fallback
}

function micErrorText(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Nettleseren har ikke lov til å bruke mikrofonen. Gi tillatelse i adressefeltet, eller skriv svaret.'
  }
  if (name === 'NotFoundError') return 'Fant ingen mikrofon. Du kan skrive svaret i stedet.'
  return 'Kunne ikke starte mikrofonen. Du kan skrive svaret i stedet.'
}

interface ChatbotChatProps {
  userEmail: string | null
  isAdmin: boolean
  chatbot: PublicChatbot
  chatRef: ChatbotRef
  editHref: string | null
  showCode: boolean
}

export function ChatbotChat({ userEmail, isAdmin, chatbot, chatRef, editHref, showCode }: ChatbotChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [phase, setPhase] = useState<Phase>('start')
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [level, setLevel] = useState(0)
  const [micSupported, setMicSupported] = useState(true)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, updateSettings] = useTalkSettings()

  const audio = useRef<HTMLAudioElement | null>(null)
  const mic = useRef(new MicInput())
  const recorder = useRef<WavRecorder | null>(null)
  const finishing = useRef(false)
  // false after «Ny samtale» or when the page closes, so no automatic step
  // starts the microphone again.
  const active = useRef(false)
  const settingsRef = useRef(settings)
  const messagesRef = useRef<Message[]>([])
  const listEnd = useRef<HTMLDivElement>(null)
  const query = refQuery(chatRef)
  const auto = settings.mode === 'auto'

  useEffect(() => {
    settingsRef.current = settings
    if (audio.current) audio.current.playbackRate = settings.rate
  }, [settings])

  useEffect(() => {
    setMicSupported(isRecordingSupported())
    const micInput = mic.current
    return () => {
      active.current = false
      recorder.current?.cancel()
      micInput.close()
      audio.current?.pause()
      messagesRef.current.forEach((m) => m.audioUrl && URL.revokeObjectURL(m.audioUrl))
    }
  }, [])

  useEffect(() => {
    messagesRef.current = messages
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, phase])

  function updateMessages(next: Message[]) {
    messagesRef.current = next
    setMessages(next)
  }

  // After the chatbot has spoken: in «Automatisk», listen for the answer.
  function afterSpeaking() {
    if (active.current && settingsRef.current.mode === 'auto' && isRecordingSupported()) {
      void startRecording()
    }
  }

  function playUrl(url: string, index: number, continueAfter: boolean) {
    const el = audio.current ?? new Audio()
    audio.current = el
    const done = () => {
      setPlayingIndex(null)
      setPhase((p) => (p === 'speaking' ? 'idle' : p))
      if (continueAfter) afterSpeaking()
    }
    el.onended = done
    el.onerror = done
    el.src = url
    el.playbackRate = settingsRef.current.rate
    setPlayingIndex(index)
    setPhase('speaking')
    el.play().catch(() => {
      // Autoplay was blocked: the student can tap «Hør» on the message.
      setPlayingIndex(null)
      setPhase('idle')
    })
  }

  // continueAfter: listen for the answer afterwards (in «Automatisk»). Not
  // when the student taps «Hør» to hear an answer again.
  async function speak(index: number, continueAfter: boolean) {
    const message = messagesRef.current[index]
    if (!message || message.role !== 'assistant') return
    if (message.audioUrl) return playUrl(message.audioUrl, index, continueAfter)

    setPhase('speaking')
    setPlayingIndex(index)
    try {
      const response = await fetch(`/api/snakkebot/lyd?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content }),
      })
      if (!response.ok) throw new Error(await errorText(response, 'Kunne ikke lese opp svaret.'))
      const url = URL.createObjectURL(await response.blob())
      updateMessages(messagesRef.current.map((m, i) => (i === index ? { ...m, audioUrl: url } : m)))
      if (!active.current) return
      playUrl(url, index, continueAfter)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lese opp svaret.')
      setPlayingIndex(null)
      setPhase('idle')
    }
  }

  async function askChatbot(history: Message[]) {
    setPhase('thinking')
    try {
      const response = await fetch(`/api/snakkebot/svar?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-LIMITS.history).map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.message) })),
        }),
      })
      if (response.status === 422) {
        // The content filter stopped this turn (often a mishearing). Drop the
        // student's last message so the conversation can go on, and listen again.
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        if (!active.current) return
        updateMessages(history.slice(0, -1))
        setPhase('idle')
        afterSpeaking()
        // After afterSpeaking(), which clears old errors when the mic opens.
        setError(body?.error || 'Kan du si det på nytt, med litt andre ord?')
        return
      }
      if (!response.ok) throw new Error(await errorText(response, 'Snakkeboten kunne ikke svare. Prøv igjen.'))
      const { reply } = (await response.json()) as { reply: string }
      if (!active.current) return
      const next = [...history, { role: 'assistant' as const, content: reply }]
      updateMessages(next)
      await speak(next.length - 1, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Snakkeboten kunne ikke svare. Prøv igjen.')
      setPhase('idle')
    }
  }

  async function start() {
    setError(null)
    setShowSettings(false)
    active.current = true
    // Unlock audio playback while we are inside the tap.
    const el = new Audio(SILENT_WAV)
    audio.current = el
    void el.play().catch(() => undefined)
    // In «Automatisk» the microphone opens later without a tap, so ask for
    // it now (iOS needs a tap to start audio).
    if (settingsRef.current.mode === 'auto' && isRecordingSupported()) {
      try {
        await mic.current.open()
      } catch (e) {
        setError(micErrorText(e))
      }
    }

    if (chatbot.greeting.trim()) {
      updateMessages([{ role: 'assistant', content: chatbot.greeting.trim() }])
      await speak(0, true)
    } else {
      updateMessages([])
      await askChatbot([])
    }
  }

  function restart() {
    active.current = false
    recorder.current?.cancel()
    recorder.current = null
    mic.current.close()
    audio.current?.pause()
    messagesRef.current.forEach((m) => m.audioUrl && URL.revokeObjectURL(m.audioUrl))
    updateMessages([])
    setPlayingIndex(null)
    setLevel(0)
    setError(null)
    setPhase('start')
  }

  async function sendStudentText(text: string) {
    const clean = text.trim().slice(0, LIMITS.message)
    if (!clean) return
    setError(null)
    const history = [...messagesRef.current, { role: 'user' as const, content: clean }]
    updateMessages(history)
    await askChatbot(history)
  }

  async function finishRecording() {
    const rec = recorder.current
    if (!rec || finishing.current) return
    finishing.current = true
    recorder.current = null
    setLevel(0)
    try {
      const recording = await rec.stop()
      if (!recording.heardSpeech || recording.seconds < 0.4) {
        setError(
          settingsRef.current.mode === 'auto'
            ? 'Jeg hørte ingenting. Trykk på mikrofonen når du vil snakke.'
            : 'Jeg hørte ingenting. Trykk på mikrofonen og snakk litt høyere.'
        )
        setPhase('idle')
        return
      }
      setPhase('transcribing')
      const response = await fetch(`/api/snakkebot/transkriber?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: recording.wav,
      })
      if (!response.ok) throw new Error(await errorText(response, 'Kunne ikke gjøre talen om til tekst.'))
      const { text } = (await response.json()) as { text: string }
      if (!active.current) return
      if (!text.trim()) {
        setError('Jeg forstod ikke hva du sa. Prøv igjen, eller skriv svaret.')
        setPhase('idle')
        return
      }
      await sendStudentText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt med opptaket.')
      setPhase('idle')
    } finally {
      finishing.current = false
    }
  }

  async function startRecording() {
    if (recorder.current || !active.current) return
    setError(null)
    audio.current?.pause()
    setPlayingIndex(null)
    const autoMode = settingsRef.current.mode === 'auto'
    const rec = new WavRecorder(mic.current, {
      maxSeconds: LIMITS.recordingSeconds,
      // «Manuell»: the student taps again to send.
      silenceMs: autoMode ? settingsRef.current.pauseMs : 0,
      noSpeechMs: autoMode ? AUTO_NO_SPEECH_MS : 0,
      onLevel: setLevel,
      onAutoStop: () => void finishRecording(),
    })
    recorder.current = rec
    try {
      await rec.start()
      setPhase('recording')
    } catch (e) {
      rec.cancel()
      recorder.current = null
      setError(micErrorText(e))
      setPhase('idle')
    }
  }

  function handleMic() {
    if (phase === 'recording') void finishRecording()
    else if (phase === 'idle' || phase === 'speaking') void startRecording()
  }

  function handleTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (phase !== 'idle' && phase !== 'speaking' && phase !== 'recording') return
    recorder.current?.cancel()
    recorder.current = null
    setLevel(0)
    audio.current?.pause()
    const text = typed
    setTyped('')
    void sendStudentText(text)
  }

  const busy = phase === 'transcribing' || phase === 'thinking'
  const lastAssistant = messages.map((m) => m.role).lastIndexOf('assistant')
  const status =
    phase === 'recording'
      ? auto
        ? 'Jeg hører på deg … Svaret sendes når du tar en pause.'
        : 'Jeg hører på deg … Trykk når du er ferdig.'
      : phase === 'transcribing'
        ? 'Skriver ned det du sa …'
        : phase === 'thinking'
          ? `${chatbot.name} tenker …`
          : phase === 'speaking'
            ? auto
              ? `${chatbot.name} snakker. Etterpå er det din tur.`
              : `${chatbot.name} snakker. Trykk på mikrofonen for å svare.`
            : 'Trykk på mikrofonen og snakk.'

  const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        compact
        backHref="/snakkebot"
        backLabel="Snakkebot"
        title={chatbot.name}
        description={chatbot.description || 'Snakk norsk med snakkeboten. Den svarer med stemme.'}
        actions={
          <>
            {showCode && (
              <span className="rounded-md bg-white/90 px-3 py-1.5 text-sm text-gray-700">
                Kode <span className="font-mono font-bold tracking-[0.2em] text-gray-900">{chatbot.accessCode}</span>
              </span>
            )}
            {editHref && (
              <Button asChild variant="outline">
                <Link href={editHref}>
                  <Pencil className="h-4 w-4" /> Rediger
                </Link>
              </Button>
            )}
            {phase !== 'start' && (
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Ny samtale
              </Button>
            )}
          </>
        }
      />

      <Card className={card}>
        <CardContent className="relative flex h-[calc(100dvh-13rem)] min-h-[26rem] flex-col p-3 sm:h-[36rem] sm:p-6">
          {showSettings && (
            <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setShowSettings(false)} />
          )}

          <div className="flex items-center justify-between gap-2 pb-2">
            <span className="text-sm text-gray-500">{auto ? 'Automatisk talemodus' : 'Manuell talemodus'}</span>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <Settings2 className="h-4 w-4" /> Innstillinger
            </button>
          </div>

          {phase === 'start' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-vlfk-mint text-vlfk-ink">
                <Mic className="h-9 w-9" />
              </span>
              <div className="max-w-md space-y-2">
                <p className="text-lg font-semibold text-gray-900">Klar til å snakke?</p>
                <p className="text-sm text-gray-600">
                  Skru på lyden. {chatbot.name} begynner samtalen.{' '}
                  {!micSupported
                    ? 'Nettleseren din kan ikke ta opp lyd, men du kan skrive svarene.'
                    : auto
                      ? 'Når den er ferdig, kan du bare snakke. Svaret ditt sendes når du tar en pause.'
                      : 'Trykk på mikrofonen når du vil svare, og igjen når du er ferdig.'}
                </p>
              </div>
              <Button size="lg" onClick={() => void start()}>
                Start samtalen
              </Button>
              <p className="max-w-md text-xs text-gray-500">
                Samtalen og lyden lagres ikke. Ikke si navn eller andre personopplysninger.
              </p>
            </div>
          ) : (
            <>
              {settings.hideMessages ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" aria-live="polite">
                  <button
                    type="button"
                    onClick={handleMic}
                    disabled={busy || !micSupported}
                    aria-label={phase === 'recording' ? (auto ? 'Send nå' : 'Stopp og send') : 'Snakk'}
                    className={cn(
                      'flex h-32 w-32 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vlfk-ink focus-visible:ring-offset-4',
                      phase === 'recording' ? 'bg-vlfk-rod-oransje text-white' : 'bg-vlfk-mint text-vlfk-ink',
                      phase === 'speaking' && 'animate-pulse'
                    )}
                    style={
                      phase === 'recording'
                        ? { boxShadow: `0 0 0 ${6 + Math.round(level * 24)}px rgba(255, 92, 57, 0.2)` }
                        : undefined
                    }
                  >
                    {busy ? (
                      <Loader2 className="h-12 w-12 animate-spin" />
                    ) : phase === 'speaking' ? (
                      <Volume2 className="h-12 w-12" />
                    ) : phase === 'recording' ? (
                      <Square className="h-10 w-10 fill-current" />
                    ) : (
                      <Mic className="h-12 w-12" />
                    )}
                  </button>
                  <p className="max-w-sm text-base font-medium text-gray-900">{status}</p>
                  {lastAssistant >= 0 && (
                    <button
                      type="button"
                      onClick={() => void speak(lastAssistant, false)}
                      disabled={busy || phase === 'recording' || phase === 'speaking'}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-vlfk-ink hover:underline disabled:opacity-50"
                    >
                      <Volume2 className="h-4 w-4" /> Hør siste svar igjen
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
                  {messages.map((message, index) =>
                    message.role === 'assistant' ? (
                      <div key={index} className="flex justify-start">
                        <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-gray-200 bg-vlfk-surface-muted px-4 py-3 text-gray-900">
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <button
                            type="button"
                            onClick={() => void speak(index, false)}
                            disabled={busy || phase === 'recording'}
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-vlfk-ink hover:underline disabled:opacity-50"
                          >
                            {playingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                            Hør
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="flex justify-end">
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-vlfk-ink px-4 py-3 leading-relaxed text-white">
                          {message.content}
                        </p>
                      </div>
                    )
                  )}
                  {busy && (
                    <div className="flex justify-start">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-vlfk-surface-muted px-4 py-3 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {phase === 'transcribing' ? 'Skriver ned det du sa …' : 'Tenker …'}
                      </span>
                    </div>
                  )}
                  <div ref={listEnd} />
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
              )}

              <div className="mt-3 flex flex-col items-center gap-2 border-t border-gray-200 pt-4">
                {micSupported && !settings.hideMessages && (
                  <>
                    <button
                      type="button"
                      onClick={handleMic}
                      disabled={busy}
                      aria-label={phase === 'recording' ? (auto ? 'Send nå' : 'Stopp og send') : 'Snakk'}
                      className={cn(
                        'relative flex h-16 w-16 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vlfk-ink focus-visible:ring-offset-2 disabled:opacity-50',
                        phase === 'recording' ? 'bg-vlfk-rod-oransje text-white' : 'bg-vlfk-ink text-white hover:opacity-90'
                      )}
                      style={
                        phase === 'recording'
                          ? { boxShadow: `0 0 0 ${4 + Math.round(level * 14)}px rgba(255, 92, 57, 0.25)` }
                          : undefined
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : phase === 'recording' ? (
                        <Square className="h-6 w-6 fill-current" />
                      ) : (
                        <Mic className="h-7 w-7" />
                      )}
                    </button>
                    <p className="text-center text-sm text-gray-600">{status}</p>
                  </>
                )}
                <form onSubmit={handleTyped} className="flex w-full max-w-xl gap-2">
                  <Input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    maxLength={LIMITS.message}
                    placeholder={micSupported ? 'Eller skriv svaret ditt her' : 'Skriv svaret ditt her'}
                    aria-label="Skriv svaret ditt"
                    disabled={busy}
                    className="bg-white text-base md:text-sm"
                  />
                  <Button type="submit" variant="outline" size="icon" aria-label="Send" disabled={busy || !typed.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
