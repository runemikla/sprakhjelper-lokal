'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import {
  TaskEditor,
  type DraftListeningTask,
} from '@/components/lytteoving/task-editor'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { MAX_LISTENING_TASKS, type ListeningQuestion } from '@/lib/lytteoving'

const GENERATE_TIMEOUT_MS = 60000

interface CreateListeningClientProps {
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

function createEmptyTask(): DraftListeningTask {
  return {
    id: crypto.randomUUID(),
    text: '',
    questionCount: 5,
    originalText: '',
    questions: [],
    audioBase64: null,
    audioMimeType: 'audio/mpeg',
    audioUrl: null,
    isGenerating: false,
  }
}

function isTaskComplete(task: DraftListeningTask): boolean {
  return (
    Boolean(task.audioBase64) &&
    task.questions.length > 0 &&
    task.questions.every((item) => item.question.trim().length > 0)
  )
}

export function CreateListeningClient({
  userEmail = null,
}: CreateListeningClientProps) {
  const [tasks, setTasks] = useState<DraftListeningTask[]>([createEmptyTask()])
  const [taskErrors, setTaskErrors] = useState<Record<string, string | null>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCode, setSavedCode] = useState<string | null>(null)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const isLocked = Boolean(savedCode)
  const isGeneratingAny = tasks.some((task) => task.isGenerating)
  const canAddTask = !isLocked && tasks.length < MAX_LISTENING_TASKS
  const canSave =
    !isLocked &&
    !isSaving &&
    !isGeneratingAny &&
    tasks.length > 0 &&
    tasks.every(isTaskComplete)

  useEffect(() => {
    return () => {
      for (const task of tasksRef.current) {
        if (task.audioUrl) {
          URL.revokeObjectURL(task.audioUrl)
        }
      }
    }
  }, [])

  function updateTask(taskId: string, patch: Partial<DraftListeningTask>) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
    )
  }

  async function handleGenerate(taskId: string) {
    const task = tasksRef.current.find((item) => item.id === taskId)
    if (!task || task.text.trim().length === 0 || task.isGenerating || isLocked) {
      return
    }

    updateTask(taskId, { isGenerating: true })
    setTaskErrors((current) => ({ ...current, [taskId]: null }))
    setSaveError(null)

    try {
      const response = await fetchWithTimeout(
        '/api/generate-listening-questions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: task.text.trim(),
            questionCount: task.questionCount,
          }),
        },
        GENERATE_TIMEOUT_MS
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        throw new Error(
          payload?.message || 'Kunne ikke lage lytteøving. Prøv igjen.'
        )
      }

      const data = (await response.json()) as {
        originalText: string
        questions: ListeningQuestion[]
        audioBase64?: string
        audioMimeType?: string
      }

      if (!data.audioBase64) {
        throw new Error('Kunne ikke lage lyd av teksten. Prøv igjen.')
      }

      const nextAudioUrl = base64ToObjectUrl(
        data.audioBase64,
        data.audioMimeType ?? 'audio/mpeg'
      )

      setTasks((current) =>
        current.map((item) => {
          if (item.id !== taskId) return item
          if (item.audioUrl) {
            URL.revokeObjectURL(item.audioUrl)
          }
          return {
            ...item,
            originalText: data.originalText,
            questions: data.questions ?? [],
            audioBase64: data.audioBase64 ?? null,
            audioMimeType: data.audioMimeType ?? 'audio/mpeg',
            audioUrl: nextAudioUrl,
            isGenerating: false,
          }
        })
      )
    } catch (err) {
      updateTask(taskId, { isGenerating: false })
      setTaskErrors((current) => ({
        ...current,
        [taskId]: err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.',
      }))
    }
  }

  function handleAddTask() {
    if (!canAddTask) return
    setTasks((current) => [...current, createEmptyTask()])
  }

  function handleRemoveTask(taskId: string) {
    if (isLocked || tasksRef.current.length <= 1) return

    setTasks((current) => {
      const removed = current.find((task) => task.id === taskId)
      if (removed?.audioUrl) {
        URL.revokeObjectURL(removed.audioUrl)
      }
      return current.filter((task) => task.id !== taskId)
    })
    setTaskErrors((current) => {
      const next = { ...current }
      delete next[taskId]
      return next
    })
  }

  async function handleSave() {
    if (!canSave) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/listening-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map((task) => ({
            originalText: task.originalText,
            questions: task.questions,
            audioBase64: task.audioBase64,
            audioMimeType: task.audioMimeType,
          })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        accessCode?: string
        error?: string
        message?: string
      } | null

      if (!response.ok || !payload?.accessCode) {
        throw new Error(
          payload?.message || payload?.error || 'Kunne ikke lagre lytteøvingen.'
        )
      }

      setSavedCode(payload.accessCode)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ListeningPageShell userEmail={userEmail}>
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Ny lytteøving</h2>
            <p className="text-sm text-gray-600">
              Lag inntil {MAX_LISTENING_TASKS} oppgaver med hver sin tekst, lyd
              og spørsmål. Elevene åpner hele øvingen med én kode.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/lytteoving">Tilbake</Link>
          </Button>
        </div>

        <CardContent className="space-y-6 pt-6">
          {tasks.map((task, index) => (
            <TaskEditor
              key={task.id}
              index={index}
              task={task}
              canRemove={tasks.length > 1}
              isLocked={isLocked}
              error={taskErrors[task.id]}
              onTextChange={(value) => updateTask(task.id, { text: value })}
              onQuestionCountChange={(value) =>
                updateTask(task.id, { questionCount: value })
              }
              onQuestionChange={(questionIndex, value) => {
                setTasks((current) =>
                  current.map((item) =>
                    item.id === task.id
                      ? {
                          ...item,
                          questions: item.questions.map((question, itemIndex) =>
                            itemIndex === questionIndex
                              ? { ...question, question: value }
                              : question
                          ),
                        }
                      : item
                  )
                )
              }}
              onGenerate={() => void handleGenerate(task.id)}
              onRemove={() => handleRemoveTask(task.id)}
            />
          ))}

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {saveError}
            </div>
          )}

          {savedCode ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">
                <p className="text-sm font-medium">Lytteøvingen er lagret.</p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em]">
                  {savedCode}
                </p>
                <p className="mt-1 text-sm">
                  Gi koden til elevene. De åpner alle oppgavene uten å logge inn.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/lytteoving">Tilbake til oversikten</Link>
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              {canAddTask && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleAddTask}
                >
                  <Plus className="h-4 w-4" />
                  Legg til oppgave ({tasks.length}/{MAX_LISTENING_TASKS})
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => void handleSave()}
                disabled={!canSave}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? 'Lagrer...' : 'Lagre lytteøving'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
