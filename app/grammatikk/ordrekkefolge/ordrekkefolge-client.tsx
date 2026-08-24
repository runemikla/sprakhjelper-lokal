'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BarChart3, Eye, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Confetti } from '@/components/ui/confetti'
import { useAudio } from '@/hooks/use-audio'
import { LevelSelector } from '@/components/grammatikk/word-order/level-selector'
import { WordBank } from '@/components/grammatikk/word-order/word-bank'
import { SentenceBuilder } from '@/components/grammatikk/word-order/sentence-builder'
import { FeedbackBanner } from '@/components/grammatikk/word-order/feedback-banner'
import { FlipCard } from '@/components/grammatikk/word-order/flip-card'
import { ReportCard } from '@/components/grammatikk/word-order/report-card'
import { useReport } from '@/components/grammatikk/word-order/use-report'
import {
  getLevelInfo,
  MAX_LEVEL,
  type Level,
  type WordToken,
  type Zone,
} from '@/components/grammatikk/word-order/types'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

type Status = 'idle' | 'correct' | 'wrong'

interface Board {
  bank: WordToken[]
  sentence: WordToken[]
}

// Delay before a new sentence is generated after a correct answer.
const NEXT_SENTENCE_DELAY = 1800

// Number of correct answers needed to level up, and the longer celebration
// delay used when that happens.
const LEVEL_UP_GOAL = 10
const LEVEL_UP_DELAY = 2600

/**
 * Fisher-Yates shuffle that ensures the result differs from the original order
 * (unless all words are identical or there is only one word).
 */
function shuffleWords(words: string[]): string[] {
  if (words.length <= 1) return [...words]

  const allSame = words.every((w) => w === words[0])
  let attempt = 0

  while (attempt < 10) {
    const shuffled = [...words]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    if (allSame || shuffled.some((w, i) => w !== words[i])) {
      return shuffled
    }
    attempt++
  }

  return [...words].reverse()
}

interface OrdrekkefolgeClientProps {
  userEmail?: string | null
}

export default function OrdrekkefolgeClient({
  userEmail = null,
}: OrdrekkefolgeClientProps) {
  // Selected difficulty (1–7). `started` flips once the first sentence loads.
  const [level, setLevel] = useState<Level>(1)
  const [started, setStarted] = useState(false)
  const [board, setBoard] = useState<Board>({ bank: [], sentence: [] })
  const [correctWords, setCorrectWords] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Running tally of correct/wrong answers. Each sentence can only count once;
  // `scored` locks the current sentence after the first definitive check.
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [scored, setScored] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showReport, setShowReport] = useState(false)

  // Persistent report (per-level stats + mistakes) stored in localStorage.
  const { report, recordResult, clearReport } = useReport()

  // Fanfare played when the student levels up.
  const { play: playFanfare } = useAudio('/audio/success-fanfare.mp3', {
    volume: 0.6,
  })

  // Randomly pick one teacher (Gunhild or Jonas) on first load. The same
  // teacher is kept for the whole session – only the expression changes.
  const [teacher, setTeacher] = useState<'gunhild' | 'jonas'>('gunhild')
  useEffect(() => {
    setTeacher(Math.random() < 0.5 ? 'gunhild' : 'jonas')
  }, [])

  // Id of the token currently being dragged (for styling) and a ref that
  // survives re-renders so drop handlers always see the latest value.
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draggingIdRef = useRef<string | null>(null)

  // Recent sentence history sent to the API for variety (max 10, cleared on
  // level-up or restart).
  const sentenceHistoryRef = useRef<string[]>([])

  const generateSentence = useCallback(async (selectedLevel: Level) => {
    setIsLoading(true)
    setError(null)
    setStatus('idle')
    setShowAnswer(false)
    setScored(false)

    try {
      const response = await fetchWithTimeout('/api/generate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: selectedLevel,
          previousSentences: sentenceHistoryRef.current,
        }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke lage en ny setning. Prøv igjen.')
      }

      const data = (await response.json()) as {
        correctWords: string[]
        sentence: string
      }

      // Track the sentence for variety in future requests (max 10).
      if (data.sentence) {
        const history = sentenceHistoryRef.current
        history.push(data.sentence)
        if (history.length > 10) history.shift()
      }

      // Shuffle the words client-side so the LLM only handles grammar.
      const shuffledWords = shuffleWords(data.correctWords)

      // Build draggable tokens with stable unique ids (words may repeat).
      const tokens: WordToken[] = shuffledWords.map((text) => ({
        id: crypto.randomUUID(),
        text,
      }))

      setBoard({ bank: tokens, sentence: [] })
      setCorrectWords(data.correctWords)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Start the exercise from the intro screen at the chosen level.
  const handleStart = useCallback(() => {
    setStarted(true)
    setScore({ correct: 0, wrong: 0 })
    sentenceHistoryRef.current = []
    clearReport()
    void generateSentence(level)
  }, [generateSentence, level, clearReport])

  // Core move logic: remove the token from wherever it is, then insert it into
  // the target zone either before a given token or at the end.
  const placeToken = useCallback(
    (tokenId: string, toZone: Zone, beforeTokenId: string | null) => {
      setBoard((prev) => {
        const token =
          prev.bank.find((t) => t.id === tokenId) ??
          prev.sentence.find((t) => t.id === tokenId)
        if (!token) return prev

        const bank = prev.bank.filter((t) => t.id !== tokenId)
        const sentence = prev.sentence.filter((t) => t.id !== tokenId)
        const target = toZone === 'bank' ? bank : sentence

        if (beforeTokenId) {
          const idx = target.findIndex((t) => t.id === beforeTokenId)
          if (idx >= 0) target.splice(idx, 0, token)
          else target.push(token)
        } else {
          target.push(token)
        }

        return toZone === 'bank' ? { bank: target, sentence } : { bank, sentence: target }
      })
      // Any move invalidates a previous wrong/correct result.
      setStatus('idle')
    },
    []
  )

  const handleDragStart = useCallback((token: WordToken) => {
    draggingIdRef.current = token.id
    setDraggingId(token.id)
  }, [])

  const handleDragEnd = useCallback(() => {
    draggingIdRef.current = null
    setDraggingId(null)
  }, [])

  const handleDropToBank = useCallback(() => {
    const id = draggingIdRef.current
    if (id) placeToken(id, 'bank', null)
  }, [placeToken])

  const handleDropToSentenceEnd = useCallback(() => {
    const id = draggingIdRef.current
    if (id) placeToken(id, 'sentence', null)
  }, [placeToken])

  const handleDropBeforeInSentence = useCallback(
    (target: WordToken) => {
      const id = draggingIdRef.current
      if (id && id !== target.id) placeToken(id, 'sentence', target.id)
    },
    [placeToken]
  )

  // Click fallback: move a chip to the opposite zone (keyboard/touch friendly).
  const handleChipClick = useCallback(
    (token: WordToken, fromZone: Zone) => {
      placeToken(token.id, fromZone === 'bank' ? 'sentence' : 'bank', null)
    },
    [placeToken]
  )

  const handleCheck = useCallback(() => {
    const attempt = board.sentence.map((t) => t.text)
    const isCorrect =
      attempt.length === correctWords.length &&
      attempt.every((word, i) => word === correctWords[i])

    if (isCorrect) {
      setStatus('correct')

      let nextLevel = level
      let leveledUp = false

      // Count at most once per sentence.
      if (!scored) {
        setScored(true)
        recordResult(level, true)
        const newCorrect = score.correct + 1

        if (newCorrect >= LEVEL_UP_GOAL) {
          // Reached the goal: level up, celebrate and reset the score.
          leveledUp = true
          nextLevel = Math.min(level + 1, MAX_LEVEL) as Level
          setLevel(nextLevel)
          setScore({ correct: 0, wrong: 0 })
          sentenceHistoryRef.current = []
          setShowConfetti(true)
          void playFanfare()
        } else {
          setScore((s) => ({ ...s, correct: newCorrect }))
        }
      }

      // Generate the next sentence after a short celebration.
      setTimeout(
        () => {
          void generateSentence(nextLevel)
        },
        leveledUp ? LEVEL_UP_DELAY : NEXT_SENTENCE_DELAY
      )
    } else {
      setStatus('wrong')
      if (!scored) {
        setScore((s) => ({ ...s, wrong: s.wrong + 1 }))
        setScored(true)
        recordResult(level, false, attempt.join(' '), correctWords.join(' '))
      }
    }
  }, [
    board.sentence,
    correctWords,
    level,
    generateSentence,
    scored,
    score.correct,
    playFanfare,
    recordResult,
  ])

  const canCheck =
    board.sentence.length > 0 && status !== 'correct' && !isLoading

  // Teacher illustration reflects the current answer state: the happy "riktig"
  // image only when the answer is correct, otherwise the "feil" image.
  const teacherImage =
    status === 'correct'
      ? `/images/${teacher}_riktig.png`
      : `/images/${teacher}_feil.png`

  return (
    <div className="min-h-screen relative">
      <Confetti isVisible={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Background image with overlay (matches Språkhjelperen) */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/Aurlandsfjorden-blaa.jpg"
          alt="Aurlandsfjorden - Norwegian fjord background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-cyan-700/50" />
        <div className="absolute bottom-4 right-4 text-white/70 text-xs bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded z-10">
          Foto: Silje Alvsaker / Vestland fylkeskommune
        </div>
      </div>

      <Navbar userEmail={userEmail} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/grammatikk"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til temaene
          </Link>

          <h1 className="mb-2 text-3xl font-bold text-white drop-shadow">
            Ordrekkefølge
          </h1>
          <p className="mb-8 text-white/90 drop-shadow">
            Dra ordene fra ordbanken og slipp dem i riktig rekkefølge for å bygge
            en korrekt norsk setning.
          </p>

          {/* Level selection */}
          {!started ? (
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="space-y-6 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Velg vanskelighetsgrad
                </h2>
                <LevelSelector
                  value={level}
                  onChange={setLevel}
                  onCommit={setLevel}
                />
                <Button onClick={handleStart} size="lg">
                  Start øvelsen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800">
                  {error}
                </div>
              )}

              <FlipCard
                flipped={showReport}
                back={
                  <ReportCard
                    report={report}
                    onClose={() => setShowReport(false)}
                    onClear={clearReport}
                  />
                }
                front={
                  <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
                    <CardContent className="space-y-6 pt-6">
                  {/* Compact level header with score */}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-gray-200 pb-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold text-blue-600">
                        Nivå {level} av {MAX_LEVEL}
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        {getLevelInfo(level).label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-3xl font-bold">
                      <span className="text-green-600">{score.correct}</span>
                      <span className="text-red-600">{score.wrong}</span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Lager en ny setning …
                    </div>
                  ) : (
                    <>
                    {/* Sentence builder with teacher illustration */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <SentenceBuilder
                          tokens={board.sentence}
                          draggingId={draggingId}
                          status={status}
                          disabled={isLoading}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDropToEnd={handleDropToSentenceEnd}
                          onDropBefore={handleDropBeforeInSentence}
                          onChipClick={handleChipClick}
                        />
                        <FeedbackBanner status={status} />
                      </div>
                      <div className="flex shrink-0 justify-center sm:w-36">
                        <Image
                          src={teacherImage}
                          alt="Lærer"
                          width={144}
                          height={144}
                          className="h-32 w-32 object-contain sm:h-36 sm:w-36"
                          priority
                        />
                      </div>
                    </div>

                    <WordBank
                      tokens={board.bank}
                      draggingId={draggingId}
                      disabled={isLoading}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDropToBank={handleDropToBank}
                      onChipClick={handleChipClick}
                    />

                    {showAnswer && correctWords.length > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Fasit:{' '}
                          <span className="font-semibold">
                            {correctWords.join(' ')}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={handleCheck} disabled={!canCheck}>
                        Sjekk svar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAnswer((v) => !v)}
                        disabled={correctWords.length === 0}
                      >
                        <Eye className="h-4 w-4" />
                        {showAnswer ? 'Skjul fasit' : 'Vis fasit'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowReport(true)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Vis rapport
                      </Button>
                      <Button
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => generateSentence(level)}
                      >
                        Ny setning
                      </Button>
                    </div>
                    </>
                  )}
                    </CardContent>
                  </Card>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
