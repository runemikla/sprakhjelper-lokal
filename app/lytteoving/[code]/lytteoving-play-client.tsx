'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AudioPlayer } from '@/components/lytteoving/audio-player'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { QuestionList } from '@/components/lytteoving/question-list'
import { StudentQuestionList } from '@/components/lytteoving/student-question-list'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import type { AnswerCheckResult, ListeningQuestion } from '@/lib/lytteoving'

interface LytteovingPlayClientProps {
  code: string
  userEmail?: string | null
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

export function LytteovingPlayClient({
  code,
  userEmail = null,
}: LytteovingPlayClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ListeningQuestion[]>([])
  const [studentAnswers, setStudentAnswers] = useState<string[]>([])
  const [results, setResults] = useState<AnswerCheckResult[] | null>(null)
  const [score, setScore] = useState<{ correctCount: number; totalCount: number } | null>(
    null
  )
  const [originalText, setOriginalText] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const canSaveEdits =
    isOwner &&
    questions.length > 0 &&
    questions.every((item) => item.question.trim().length > 0) &&
    !isSaving

  const canCheckAnswers =
    !isOwner &&
    questions.length > 0 &&
    studentAnswers.length === questions.length &&
    studentAnswers.every((answer) => answer.trim().length > 0) &&
    !isChecking

  useEffect(() => {
    let isCancelled = false
    let objectUrl: string | null = null

    async function loadExercise() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithTimeout(`/api/listening-exercises/${code}`)
        const payload = (await response.json().catch(() => null)) as {
          questions?: ListeningQuestion[]
          originalText?: string
          audioBase64?: string
          audioMimeType?: string
          isOwner?: boolean
          error?: string
        } | null

        if (!response.ok || !payload?.audioBase64) {
          throw new Error(payload?.error || 'Fant ingen lytteøving med denne koden.')
        }

        if (isCancelled) return

        const loadedQuestions = payload.questions ?? []
        objectUrl = base64ToObjectUrl(
          payload.audioBase64,
          payload.audioMimeType ?? 'audio/mpeg'
        )
        setQuestions(loadedQuestions)
        setStudentAnswers(loadedQuestions.map(() => ''))
        setOriginalText(payload.originalText ?? null)
        setIsOwner(Boolean(payload.isOwner))
        setAudioUrl(objectUrl)
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadExercise()

    return () => {
      isCancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [code])

  async function handleSaveEdits() {
    if (!canSaveEdits) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/listening-exercises/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error || 'Kunne ikke lagre endringene.')
      }

      router.push('/lytteoving')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCheckAnswers() {
    if (!canCheckAnswers) return

    setIsChecking(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(
        `/api/listening-exercises/${code}/check-answers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: studentAnswers }),
        },
        60000
      )

      const payload = (await response.json().catch(() => null)) as {
        results?: AnswerCheckResult[]
        correctCount?: number
        totalCount?: number
        error?: string
      } | null

      if (!response.ok || !payload?.results) {
        throw new Error(payload?.error || 'Kunne ikke sjekke svarene. Prøv igjen.')
      }

      setResults(payload.results)
      setScore({
        correctCount: payload.correctCount ?? 0,
        totalCount: payload.totalCount ?? questions.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <ListeningPageShell userEmail={userEmail}>
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lytteøving</h2>
            <p className="text-sm text-gray-600">
              Kode: <span className="font-mono font-semibold tracking-[0.2em]">{code}</span>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/lytteoving">Tilbake</Link>
          </Button>
        </div>
        <CardContent className="space-y-6 pt-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Laster lytteøving...
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
              {!audioUrl && (
                <Button asChild variant="outline">
                  <Link href="/lytteoving">Prøv en annen kode</Link>
                </Button>
              )}
            </div>
          )}

          {!isLoading && audioUrl && (
            <>
              <AudioPlayer src={audioUrl} />

              {isOwner && originalText && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Original tekst
                  </h2>
                  <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-gray-800">
                    {originalText}
                  </p>
                </div>
              )}

              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  Spørsmål
                </h2>
                {!isOwner && (
                  <p className="mb-3 text-sm text-gray-600">
                    Lytt til teksten og skriv svaret ditt under hvert spørsmål.
                    Trykk «Sjekk svar» når du er ferdig.
                  </p>
                )}
                {isOwner ? (
                  <QuestionList
                    questions={questions}
                    editable
                    onChange={(index, value) => {
                      setQuestions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, question: value } : item
                        )
                      )
                    }}
                  />
                ) : (
                  <StudentQuestionList
                    questions={questions}
                    answers={studentAnswers}
                    results={results}
                    disabled={isChecking}
                    onAnswerChange={(index, value) => {
                      setResults(null)
                      setScore(null)
                      setStudentAnswers((current) =>
                        current.map((answer, itemIndex) =>
                          itemIndex === index ? value : answer
                        )
                      )
                    }}
                  />
                )}
              </div>

              {isOwner ? (
                <Button
                  className="w-full"
                  onClick={() => void handleSaveEdits()}
                  disabled={!canSaveEdits}
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Lagrer...' : 'Lagre endringer'}
                </Button>
              ) : (
                <div className="space-y-3">
                  {score && (
                    <p className="text-center text-sm font-medium text-gray-800">
                      Du fikk {score.correctCount} av {score.totalCount} riktige.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => void handleCheckAnswers()}
                    disabled={!canCheckAnswers}
                  >
                    {isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isChecking ? 'Sjekker svar...' : 'Sjekk svar'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
