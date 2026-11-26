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
import { cleanReply, sentenceEnd } from '@/lib/snakkebot/text'
import { LIMITS, refQuery, type ChatbotRef, type PublicChatbot } from '@/lib/snakkebot/types'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  // recording of an assistant message, once it has been read aloud
  audioUrl?: string
}

type Phase = 'start' | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'ended'

// The answer being read aloud, sentence by sentence while it streams in.
interface SpeechQueue {
  turn: number
  // message the sentences belong to
  index: number
  // audio for each sentence (object URLs), fetched in parallel, played in order
  items: Promise<string>[]
  next: number
  playing: boolean
  // the whole answer has arrived
  ended: boolean
}

// Points in time (performance.now()) for the admin timing line.
interface Marks {
  stop?: number
  sttDone?: number
  sent?: number
  first?: number
  done?: number
  audio?: number
  serverFirst?: number
}

function seconds(ms: number | undefined): string {
  return ms === undefined ? '–' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

// The conversation ends when the microphone has been open this long without
// the student saying anything, so it is never left on by mistake.
const NO_SPEECH_MS = LIMITS.silenceEndSeconds * 1000
// «Manuell»: after the student has spoken, this much silence sends the answer.
const MANUAL_SILENCE_MS = LIMITS.silenceEndSeconds * 1000

type EndReason = 'time' | 'silence'

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

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
  const [timing, setTiming] = useState<string | null>(null)
  const [endReason, setEndReason] = useState<EndReason | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(LIMITS.conversationSeconds)
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
  // Goes up when a new answer starts or the student interrupts, so old
  // sentences are not read aloud any more.
  const turn = useRef(0)
  const marks = useRef<Marks>({})
  // When the conversation started (Date.now()), and whether its time is up.
  const startedAt = useRef(0)
  const timeUp = useRef(false)
  const phaseRef = useRef<Phase>('start')
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

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // The clock: at most LIMITS.conversationSeconds per conversation. When the
  // time is up, the chatbot says goodbye after the student's next answer (or
  // the conversation ends at once if nobody is talking).
  const running = phase !== 'start' && phase !== 'ended'
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const left = LIMITS.conversationSeconds - (Date.now() - startedAt.current) / 1000
      setSecondsLeft(left)
      if (left <= 0 && !timeUp.current) {
        timeUp.current = true
        if (phaseRef.current === 'idle') endConversation('time')
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // Stops everything (microphone, audio, requests) but keeps the messages.
  function endConversation(reason: EndReason) {
    turn.current++
    active.current = false
    recorder.current?.cancel()
    recorder.current = null
    mic.current.close()
    audio.current?.pause()
    setPlayingIndex(null)
    setLevel(0)
    setEndReason(reason)
    setPhase('ended')
  }

  function updateMessages(next: Message[]) {
    messagesRef.current = next
    setMessages(next)
  }

  // After the chatbot has spoken: in «Automatisk», listen for the answer.
  function afterSpeaking() {
    if (timeUp.current && active.current) {
      endConversation('time')
      return
    }
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
    // Stops sentences still queued from a streamed answer.
    turn.current++
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

  // Admins see how long each step took, to find where the waiting is.
  function showTiming() {
    if (!isAdmin) return
    const m = marks.current
    const from = (t?: number) => (t !== undefined && m.sent !== undefined ? t - m.sent : undefined)
    const parts = [
      m.stop !== undefined && m.sttDone !== undefined ? `Tale til tekst ${seconds(m.sttDone - m.stop)}` : null,
      `Første ord ${seconds(from(m.first))}${m.serverFirst !== undefined ? ` (modellen ${seconds(m.serverFirst)})` : ''}`,
      `Hele svaret ${seconds(from(m.done))}`,
      `Lyd starter ${seconds(from(m.audio))}`,
      m.stop !== undefined && m.audio !== undefined ? `Totalt fra du stoppet ${seconds(m.audio - m.stop)}` : null,
    ]
    setTiming(parts.filter(Boolean).join(' · '))
  }

  function fetchSpeech(text: string): Promise<string> {
    return fetch(`/api/snakkebot/lyd?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(await errorText(response, 'Kunne ikke lese opp svaret.'))
      return URL.createObjectURL(await response.blob())
    })
  }

  function enqueueSpeech(q: SpeechQueue, text: string) {
    if (q.turn !== turn.current || !text) return
    const item = fetchSpeech(text)
    item.catch(() => undefined)
    q.items.push(item)
    if (!q.playing) void playNextSentence(q)
  }

  function endSpeech(q: SpeechQueue) {
    q.ended = true
    if (!q.playing) void playNextSentence(q)
  }

  async function playNextSentence(q: SpeechQueue) {
    if (q.turn !== turn.current || !active.current) return
    if (q.next >= q.items.length) {
      q.playing = false
      if (q.ended) {
        setPlayingIndex(null)
        setPhase((p) => (p === 'speaking' || p === 'thinking' ? 'idle' : p))
        afterSpeaking()
      }
      return
    }
    q.playing = true
    let url: string
    try {
      url = await q.items[q.next++]
    } catch (e) {
      q.playing = false
      if (q.turn !== turn.current) return
      setError(e instanceof Error ? e.message : 'Kunne ikke lese opp svaret.')
      setPlayingIndex(null)
      setPhase('idle')
      return
    }
    if (q.turn !== turn.current || !active.current) {
      URL.revokeObjectURL(url)
      return
    }
    if (marks.current.audio === undefined) {
      marks.current.audio = performance.now()
      showTiming()
    }
    const el = audio.current ?? new Audio()
    audio.current = el
    const done = () => {
      URL.revokeObjectURL(url)
      void playNextSentence(q)
    }
    el.onended = done
    el.onerror = done
    el.src = url
    el.playbackRate = settingsRef.current.rate
    setPlayingIndex(q.index)
    setPhase('speaking')
    el.play().catch(() => {
      // Autoplay was blocked: the student can tap «Hør» on the message.
      q.turn = -1
      q.playing = false
      setPlayingIndex(null)
      setPhase('idle')
    })
  }

  async function askChatbot(history: Message[]) {
    const myTurn = ++turn.current
    setPhase('thinking')
    marks.current.sent = performance.now()
    try {
      const response = await fetch(`/api/snakkebot/svar?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-LIMITS.history).map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.message) })),
          ending: timeUp.current || undefined,
        }),
      })
      if (response.status === 422) {
        // The content filter stopped this turn (often a mishearing). Drop the
        // student's last message so the conversation can go on, and listen again.
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        if (!active.current || myTurn !== turn.current) return
        updateMessages(history.slice(0, -1))
        setPhase('idle')
        afterSpeaking()
        // After afterSpeaking(), which clears old errors when the mic opens.
        setError(body?.error || 'Kan du si det på nytt, med litt andre ord?')
        return
      }
      if (!response.ok || !response.body) {
        throw new Error(await errorText(response, 'Snakkeboten kunne ikke svare. Prøv igjen.'))
      }

      // The answer streams in. Each finished sentence is sent to be read
      // aloud at once, so the student hears the start before the end is written.
      const index = history.length
      const q: SpeechQueue = { turn: myTurn, index, items: [], next: 0, playing: false, ended: false }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let raw = ''
      let text = ''
      let spoken = 0
      let failed: string | null = null

      const addPiece = (piece: string) => {
        raw += piece
        text = cleanReply(raw).slice(0, 2000)
        if (marks.current.first === undefined) {
          marks.current.first = performance.now()
          updateMessages([...history, { role: 'assistant', content: text }])
          setPhase('speaking')
        } else {
          updateMessages(messagesRef.current.map((m, i) => (i === index ? { ...m, content: text } : m)))
        }
        let end: number
        while ((end = sentenceEnd(text, spoken)) >= 0) {
          enqueueSpeech(q, text.slice(spoken, end).trim())
          spoken = end
        }
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (myTurn !== turn.current || !active.current) {
          void reader.cancel()
          return
        }
        if (value) buffer += decoder.decode(value, { stream: true })
        let newline: number
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          if (!line) continue
          const event = JSON.parse(line) as { d?: string; done?: boolean; ms?: { first?: number }; error?: string }
          if (event.d) addPiece(event.d)
          if (event.ms?.first !== undefined) marks.current.serverFirst = event.ms.first
          if (event.error) failed = event.error
        }
        if (done) break
      }
      marks.current.done = performance.now()
      showTiming()

      if (!text) throw new Error(failed ?? 'Snakkeboten kunne ikke svare. Prøv igjen.')
      if (failed) setError(failed)
      enqueueSpeech(q, text.slice(spoken).trim())
      endSpeech(q)
    } catch (e) {
      if (myTurn !== turn.current) return
      setError(e instanceof Error ? e.message : 'Snakkeboten kunne ikke svare. Prøv igjen.')
      setPhase('idle')
    }
  }

  // Opens the microphone inside the tap (iOS) when «Automatisk» will need it.
  async function openMicIfAuto() {
    if (settingsRef.current.mode === 'auto' && isRecordingSupported()) {
      try {
        await mic.current.open()
      } catch (e) {
        setError(micErrorText(e))
      }
    }
  }

  // After «Fortsett samtalen»: the student starts talking again.
  async function resume() {
    setError(null)
    setEndReason(null)
    active.current = true
    await openMicIfAuto()
    setPhase('idle')
    if (isRecordingSupported()) void startRecording()
  }

  async function start() {
    setError(null)
    setShowSettings(false)
    active.current = true
    marks.current = {}
    startedAt.current = Date.now()
    timeUp.current = false
    setSecondsLeft(LIMITS.conversationSeconds)
    setEndReason(null)
    // Unlock audio playback while we are inside the tap.
    const el = new Audio(SILENT_WAV)
    audio.current = el
    void el.play().catch(() => undefined)
    // In «Automatisk» the microphone opens later without a tap, so ask for
    // it now (iOS needs a tap to start audio).
    await openMicIfAuto()

    if (chatbot.greeting.trim()) {
      updateMessages([{ role: 'assistant', content: chatbot.greeting.trim() }])
      await speak(0, true)
    } else {
      updateMessages([])
      await askChatbot([])
    }
  }

  function restart() {
    turn.current++
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
    setTiming(null)
    setEndReason(null)
    timeUp.current = false
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

  // byUser: the student tapped to stop. Otherwise the recorder stopped itself
  // (pause after speaking, or nothing said for NO_SPEECH_MS).
  async function finishRecording(byUser = false) {
    const rec = recorder.current
    if (!rec || finishing.current) return
    finishing.current = true
    recorder.current = null
    setLevel(0)
    marks.current = { stop: performance.now() }
    try {
      const recording = await rec.stop()
      if (!recording.heardSpeech || recording.seconds < 0.4) {
        // Nothing said: end the conversation so the microphone is not left on.
        if (!byUser) {
          endConversation(timeUp.current ? 'time' : 'silence')
          return
        }
        if (timeUp.current) {
          endConversation('time')
          return
        }
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
      marks.current.sttDone = performance.now()
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
    // Stops an answer that is still being read aloud.
    turn.current++
    setError(null)
    audio.current?.pause()
    setPlayingIndex(null)
    const autoMode = settingsRef.current.mode === 'auto'
    const rec = new WavRecorder(mic.current, {
      maxSeconds: LIMITS.recordingSeconds,
      // «Manuell»: the student taps again to send.
      // «Manuell» also sends after a long silence, so the mic is not left on.
      silenceMs: autoMode ? settingsRef.current.pauseMs : MANUAL_SILENCE_MS,
      noSpeechMs: NO_SPEECH_MS,
      onLevel: setLevel,
      onAutoStop: () => void finishRecording(false),
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
    if (phase === 'recording') void finishRecording(true)
    else if (phase === 'idle' || phase === 'speaking') void startRecording()
  }

  function handleTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (phase !== 'idle' && phase !== 'speaking' && phase !== 'recording') return
    recorder.current?.cancel()
    recorder.current = null
    setLevel(0)
    audio.current?.pause()
    turn.current++
    marks.current = {}
    const text = typed
    setTyped('')
    void sendStudentText(text)
  }

  const busy = phase === 'transcribing' || phase === 'thinking'
  const lastAssistant = messages.map((m) => m.role).lastIndexOf('assistant')
  // One short word: the button itself shows the rest.
  const status =
    phase === 'recording'
      ? 'Lytter'
      : phase === 'transcribing' || phase === 'thinking'
        ? 'Tenker'
        : phase === 'speaking'
          ? 'Snakker'
          : 'Din tur'

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
            <span className="text-sm text-gray-500">
              {auto ? 'Automatisk talemodus' : 'Manuell talemodus'}
              {running && (
                <>
                  {' · '}
                  <span className={cn('tabular-nums', secondsLeft <= 60 && 'font-medium text-vlfk-ink')} aria-label="Tid igjen">
                    {clock(secondsLeft)}
                  </span>
                </>
              )}
            </span>
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
                En samtale varer i høyst {LIMITS.conversationSeconds / 60} minutter. Samtalen og lyden lagres ikke. Ikke si navn eller andre personopplysninger.
              </p>
            </div>
          ) : (
            <>
              {phase === 'ended' && settings.hideMessages ? (
                <div className="flex-1" />
              ) : settings.hideMessages ? (
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
                        Tenker …
                      </span>
                    </div>
                  )}
                  <div ref={listEnd} />
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
              )}

              {phase === 'ended' ? (
                <div className="mt-3 flex flex-col items-center gap-3 border-t border-gray-200 pt-4 text-center" aria-live="polite">
                  <p className="font-medium text-gray-900">
                    {endReason === 'time'
                      ? `Samtalen er ferdig. Dere har snakket i ${LIMITS.conversationSeconds / 60} minutter.`
                      : `Samtalen stoppet fordi det var stille i ${LIMITS.silenceEndSeconds} sekunder.`}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {endReason === 'silence' && !timeUp.current && (
                      <Button onClick={() => void resume()}>
                        <Mic className="h-4 w-4" /> Fortsett samtalen
                      </Button>
                    )}
                    <Button variant={endReason === 'silence' ? 'outline' : 'default'} onClick={restart}>
                      <RotateCcw className="h-4 w-4" /> Ny samtale
                    </Button>
                  </div>
                </div>
              ) : (
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
                {isAdmin && timing && <p className="text-center text-xs text-gray-500">{timing}</p>}
              </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
