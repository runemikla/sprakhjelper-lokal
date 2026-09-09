'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { type SavedListeningExercise } from '@/lib/lytteoving'

interface TeacherHomeClientProps {
  userEmail?: string | null
  savedExercises: SavedListeningExercise[]
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function TeacherHomeClient({
  userEmail = null,
  savedExercises,
}: TeacherHomeClientProps) {
  const router = useRouter()
  const [exercises, setExercises] = useState(savedExercises)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(exercise: SavedListeningExercise) {
    const confirmed = window.confirm(
      `Vil du slette lytteøvingen med kode ${exercise.accessCode}? Dette kan ikke angres.`
    )
    if (!confirmed) return

    setDeletingId(exercise.id)
    setError(null)

    try {
      const response = await fetch('/api/listening-exercises', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exercise.id }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error || 'Kunne ikke slette lytteøvingen.')
      }

      setExercises((current) => current.filter((item) => item.id !== exercise.id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ListeningPageShell userEmail={userEmail}>
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lytteøving</h2>
            <p className="text-sm text-gray-600">
              Åpne en øving for å spille den av, eller slett den. Del koden med
              elevene — de trenger ikke logge inn.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/lytteoving/ny">Lag ny</Link>
          </Button>
        </div>

        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {exercises.length === 0 ? (
            <p className="text-gray-600">
              Du har ikke laget noen lytteøvinger ennå. Trykk «Lag ny» for å
              komme i gang.
            </p>
          ) : (
            <ul className="space-y-3">
              {exercises.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-xl font-bold tracking-[0.3em] text-gray-900">
                      {exercise.accessCode}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {exercise.taskCount > 1
                        ? `${exercise.taskCount} oppgaver · ${exercise.originalText}`
                        : exercise.originalText}
                    </p>
                    {exercise.createdAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        {formatCreatedAt(exercise.createdAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/lytteoving/${exercise.accessCode}`}>Åpne</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void handleDelete(exercise)}
                      disabled={deletingId === exercise.id}
                    >
                      {deletingId === exercise.id && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Slett
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
