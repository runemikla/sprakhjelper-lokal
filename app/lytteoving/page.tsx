import Link from 'next/link'
import { getUser, createClient } from '@/lib/supabase/server'
import { isTeacher } from '@/lib/auth/roles'
import { previewText, type SavedListeningExercise } from '@/lib/lytteoving'
import { JoinExerciseCard } from '@/components/lytteoving/join-exercise-card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { TeacherHomeClient } from '@/components/lytteoving/teacher-home'
import { Card, CardContent } from '@/components/ui/card'

export default async function LytteovingPage() {
  const user = await getUser()
  const teacher = await isTeacher(user)

  if (user && teacher) {
    const supabase = await createClient()
    const { data, error: queryError } = await supabase
      .from('listening_exercises')
      .select('id, access_code, original_text, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    const savedExercises: SavedListeningExercise[] = queryError
      ? []
      : (data ?? []).map((row) => ({
          id: row.id,
          accessCode: row.access_code,
          originalText: previewText(row.original_text),
          createdAt: row.created_at,
        }))

    return (
      <TeacherHomeClient
        userEmail={user.email ?? null}
        savedExercises={savedExercises}
      />
    )
  }

  return (
    <ListeningPageShell userEmail={user?.email ?? null}>
      <JoinExerciseCard />
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardContent className="pt-6">
          <p className="text-gray-700">
            Bare lærere kan lage og lagre lytteøvinger.{' '}
            {user ? (
              'Kontoen din har ikke lærerrolle.'
            ) : (
              <>
                <Link
                  href="/auth/login?next=/lytteoving"
                  className="font-medium underline underline-offset-4"
                >
                  Logg inn
                </Link>{' '}
                som lærer for å opprette en øving.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
