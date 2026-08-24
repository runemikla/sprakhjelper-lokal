'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AudioPlayer } from '@/components/lytteoving/audio-player'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { QuestionList } from '@/components/lytteoving/question-list'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import type { ListeningQuestion } from '@/lib/lytteoving'

const MAX_CHARS = 1000
const QUESTION_COUNTS = [3, 5, 8, 10]
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

export function CreateListeningClient({
  userEmail = null,
}: CreateListeningClientProps) {
  const [text, setText] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalText, setOriginalText] = useState('')
  const [questions, setQuestions] = useState<ListeningQuestion[]>([])
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [audioMimeType, setAudioMimeType] = useState('audio/mpeg')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [savedCode, setSavedCode] = useState<string | null>(null)

  const hasCompleteQuestions = questions.every(
    (item) => item.question.trim().length > 0
  )
  const canGenerate = text.trim().length > 0 && !isLoading
  const canSave =
    questions.length > 0 &&
    hasCompleteQuestions &&
    Boolean(audioBase64) &&
    !isSaving &&
    !savedCode

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  async function handleGenerate() {
    if (!canGenerate) return

    setIsLoading(true)
    setError(null)
    setQuestions([])
    setOriginalText('')
    setAudioBase64(null)
    setSavedCode(null)
    setAudioUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return null
    })

    try {
      const response = await fetchWithTimeout(
        '/api/generate-listening-questions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            questionCount,
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

      setOriginalText(data.originalText)
      setQuestions(data.questions ?? [])
      setAudioBase64(data.audioBase64)
      setAudioMimeType(data.audioMimeType ?? 'audio/mpeg')
      setAudioUrl(
        base64ToObjectUrl(data.audioBase64, data.audioMimeType ?? 'audio/mpeg')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!canSave || !audioBase64) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/listening-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText,
          questions,
          audioBase64,
          audioMimeType,
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
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
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
              Lim inn en tekst, lag spørsmål og lagre øvingen med en kode elevene
              kan bruke.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/lytteoving">Tilbake</Link>
          </Button>
        </div>

        <CardContent className="pt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleGenerate()
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="question-count" className="text-lg font-semibold">
                Hvor mange spørsmål vil du ha?
              </Label>
              <Select
                value={String(questionCount)}
                onValueChange={(value) => setQuestionCount(Number(value))}
                disabled={isLoading}
              >
                <SelectTrigger id="question-count">
                  <SelectValue placeholder="Velg antall spørsmål" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} spørsmål
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="listening-text" className="text-lg font-semibold">
                Lim inn teksten din her:
              </Label>
              <div className="relative">
                <Textarea
                  id="listening-text"
                  value={text}
                  maxLength={MAX_CHARS}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) {
                      setText(e.target.value)
                    }
                  }}
                  placeholder="Skriv eller lim inn teksten din her..."
                  className="min-h-[200px] pb-8"
                  disabled={isLoading}
                />
                <span
                  className={`absolute bottom-2 right-3 text-xs tabular-nums ${
                    text.length >= MAX_CHARS
                      ? 'text-red-500 font-semibold'
                      : text.length >= MAX_CHARS - 100
                        ? 'text-amber-500'
                        : 'text-gray-400'
                  }`}
                >
                  {text.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!canGenerate}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Lager lytteøving...' : 'Start'}
            </Button>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="space-y-6 pt-6">
            {audioUrl && <AudioPlayer src={audioUrl} />}

            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                Original tekst
              </h2>
              <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-gray-800">
                {originalText}
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Spørsmål
              </h2>
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
            </div>

            <div className="space-y-3">
              {savedCode ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">
                    <p className="text-sm font-medium">Lytteøvingen er lagret.</p>
                    <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em]">
                      {savedCode}
                    </p>
                    <p className="mt-1 text-sm">
                      Gi koden til elevene. De åpner øvingen uten å logge inn.
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/lytteoving">Tilbake til oversikten</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => void handleSave()}
                  disabled={!canSave}
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Lagrer...' : 'Lagre lytteøving'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </ListeningPageShell>
  )
}
