'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AudioPlayer } from '@/components/lytteoving/audio-player'
import {
  buildSummaryItems,
  ListeningSummary,
} from '@/components/lytteoving/listening-summary'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { QuestionList } from '@/components/lytteoving/question-list'
import { StudentQuestionList } from '@/components/lytteoving/student-question-list'
import { Confetti } from '@/components/ui/confetti'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import {
  isStatementQuestion,
  isStatementTask,
  type AnswerCheckResult,
  type ListeningQuestion,
} from '@/lib/lytteoving'

interface LytteovingPlayClientProps {
  code: string
  userEmail?: string | null
}

interface LoadedTask {
  position: number
  originalText: string | null
  questions: ListeningQuestion[]
  audioUrl: string
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

function emptyAnswers(questions: ListeningQuestion[]): string[] {
  return questions.map(() => '')
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
  const [tasks, setTasks] = useState<LoadedTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [studentAnswers, setStudentAnswers] = useState<string[][]>([])
  const [results, setResults] = useState<(AnswerCheckResult[] | null)[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [teacherVersion] = useState<1 | 2>(() => (Math.random() < 0.5 ? 1 : 2))

  const currentTask = tasks[currentIndex]
  const currentIsStatementTask = currentTask
    ? isStatementTask(currentTask.questions)
    : false
  const currentAnswers = studentAnswers[currentIndex] ?? []
  const currentResults = results[currentIndex] ?? null
  const hasMultipleTasks = tasks.length > 1

  const canSaveEdits =
    isOwner &&
    Boolean(currentTask) &&
    currentTask.questions.length > 0 &&
    currentTask.questions.every((item) => {
      if (item.question.trim().length === 0) return false
      if (isStatementQuestion(item) && typeof item.isTrue !== 'boolean') {
        return false
      }
      return true
    }) &&
    !isSaving

  const hasAnsweredAllCurrentQuestions =
    Boolean(currentTask) &&
    currentTask.questions.length > 0 &&
    currentAnswers.length === currentTask.questions.length &&
    currentAnswers.every((answer) => answer.trim().length > 0)

  const canGoToNextTask =
    currentIndex < tasks.length - 1 &&
    (isOwner || hasAnsweredAllCurrentQuestions)

  const canCheckAnswers =
    !isOwner && hasAnsweredAllCurrentQuestions && !isChecking

  const allTasksChecked =
    tasks.length > 0 && results.every((item) => Boolean(item && item.length > 0))
  const isLastTask = currentIndex === tasks.length - 1
  const canShowSummary = !isOwner && allTasksChecked
  const summaryItems = buildSummaryItems(tasks, studentAnswers, results)
  const allAnswersCorrect =
    summaryItems.length > 0 && summaryItems.every((item) => item.isCorrect)

  useEffect(() => {
    let isCancelled = false
    const objectUrls: string[] = []

    async function loadExercise() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithTimeout(`/api/listening-exercises/${code}`)
        const payload = (await response.json().catch(() => null)) as {
          tasks?: {
            position: number
            originalText?: string
            questions?: ListeningQuestion[]
            audioBase64?: string
            audioMimeType?: string
          }[]
          isOwner?: boolean
          error?: string
        } | null

        const loadedTasks = (payload?.tasks ?? [])
          .filter((task) => Boolean(task.audioBase64))
          .map((task) => {
            const audioUrl = base64ToObjectUrl(
              task.audioBase64 as string,
              task.audioMimeType ?? 'audio/mpeg'
            )
            objectUrls.push(audioUrl)
            return {
              position: task.position,
              originalText: task.originalText ?? null,
              questions: task.questions ?? [],
              audioUrl,
            }
          })

        if (!response.ok || loadedTasks.length === 0) {
          throw new Error(payload?.error || 'Fant ingen lytteøving med denne koden.')
        }

        if (isCancelled) return

        setTasks(loadedTasks)
        setStudentAnswers(loadedTasks.map((task) => emptyAnswers(task.questions)))
        setResults(loadedTasks.map(() => null))
        setCurrentIndex(0)
        setIsOwner(Boolean(payload?.isOwner))
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
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [code])

  async function handleSaveEdits() {
    if (!canSaveEdits || !currentTask) return

    setIsSaving(true)
    setError(null)
    setSaveMessage(null)

    try {
      const response = await fetch(`/api/listening-exercises/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskPosition: currentTask.position,
          questions: currentTask.questions,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error || 'Kunne ikke lagre endringene.')
      }

      if (hasMultipleTasks) {
        setSaveMessage('Spørsmålene for denne oppgaven er lagret.')
      } else {
        router.push('/lytteoving')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCheckAnswers() {
    if (!canCheckAnswers || !currentTask) return

    setIsChecking(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(
        `/api/listening-exercises/${code}/check-answers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskPosition: currentTask.position,
            answers: currentAnswers,
          }),
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

      setResults((current) =>
        current.map((item, index) =>
          index === currentIndex ? payload.results ?? null : item
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsChecking(false)
    }
  }

  function handleShowSummary() {
    if (!canShowSummary) return
    setShowSummary(true)
    if (allAnswersCorrect) {
      setShowConfetti(true)
    }
  }

  return (
    <ListeningPageShell userEmail={userEmail}>
      {showSummary && !isOwner ? (
        <ListeningSummary
          code={code}
          items={summaryItems}
          teacherVersion={teacherVersion}
          onBack={() => setShowSummary(false)}
        />
      ) : (
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lytteøving</h2>
            <p className="text-sm text-gray-600">
              Kode: <span className="font-mono font-semibold tracking-[0.2em]">{code}</span>
            </p>
            {!isLoading && !isOwner && currentTask && (
              <p className="mt-2 text-sm text-gray-600">
                {currentIsStatementTask
                  ? 'Lytt til teksten og velg om hver påstand er sant eller usant.'
                  : 'Lytt til teksten og skriv svaret ditt under hvert spørsmål.'}
                {hasMultipleTasks
                  ? ' Svar på alle før du går til neste oppgave.'
                  : ''}{' '}
                Trykk «Sjekk svar» når du er ferdig.
              </p>
            )}
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
              {!currentTask && (
                <Button asChild variant="outline">
                  <Link href="/lytteoving">Prøv en annen kode</Link>
                </Button>
              )}
            </div>
          )}

          {!isLoading && currentTask && (
            <>
              <AudioPlayer src={currentTask.audioUrl} />

              {isOwner && currentTask.originalText && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Original tekst
                  </h2>
                  <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-gray-800">
                    {currentTask.originalText}
                  </p>
                </div>
              )}

              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  {currentIsStatementTask ? 'Påstander' : 'Spørsmål'}
                </h2>
                {isOwner ? (
                  <QuestionList
                    questions={currentTask.questions}
                    editable
                    idPrefix={`play-task-${currentTask.position}-question`}
                    onChange={(index, patch) => {
                      setTasks((current) =>
                        current.map((task, taskIndex) =>
                          taskIndex === currentIndex
                            ? {
                                ...task,
                                questions: task.questions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, ...patch } : item
                                ),
                              }
                            : task
                        )
                      )
                    }}
                  />
                ) : (
                  <StudentQuestionList
                    questions={currentTask.questions}
                    answers={currentAnswers}
                    results={currentResults}
                    disabled={isChecking}
                    idPrefix={`play-task-${currentTask.position}-answer`}
                    onAnswerChange={(index, value) => {
                      setResults((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === currentIndex ? null : item
                        )
                      )
                      setStudentAnswers((current) =>
                        current.map((answers, taskIndex) =>
                          taskIndex === currentIndex
                            ? answers.map((answer, itemIndex) =>
                                itemIndex === index ? value : answer
                              )
                            : answers
                        )
                      )
                    }}
                  />
                )}
              </div>

              {isOwner ? (
                <div className="space-y-3">
                  {saveMessage && (
                    <p className="text-center text-sm font-medium text-green-700">
                      {saveMessage}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => void handleSaveEdits()}
                    disabled={!canSaveEdits}
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSaving
                      ? 'Lagrer...'
                      : hasMultipleTasks
                        ? 'Lagre spørsmål for denne oppgaven'
                        : 'Lagre endringer'}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => void handleCheckAnswers()}
                  disabled={!canCheckAnswers}
                >
                  {isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isChecking ? 'Sjekker svar...' : 'Sjekk svar'}
                </Button>
              )}

              {(!isOwner || hasMultipleTasks) && (
                <div className="mt-6 space-y-4">
                  <div className="w-full">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{
                          width: `${((currentIndex + 1) / tasks.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Forrige
                    </Button>

                    <span className="text-sm text-gray-500">
                      Oppgave {currentIndex + 1} av {tasks.length}
                    </span>

                    {!isOwner && isLastTask ? (
                      <Button
                        type="button"
                        onClick={handleShowSummary}
                        disabled={!canShowSummary}
                        title={
                          canShowSummary
                            ? undefined
                            : 'Sjekk svarene på alle oppgavene før du ser sammendraget'
                        }
                        className="border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Vis sammendrag
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setCurrentIndex((index) => Math.min(tasks.length - 1, index + 1))
                        }
                        disabled={!canGoToNextTask}
                        title={
                          !isOwner && !hasAnsweredAllCurrentQuestions
                            ? 'Svar på alle spørsmålene før du går videre'
                            : undefined
                        }
                      >
                        Neste
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}
      <Confetti isVisible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </ListeningPageShell>
  )
}
