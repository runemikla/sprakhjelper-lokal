import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { WordListOverview } from '@/components/laer-ord/overview'
import { getPageUser } from '@/lib/auth/page-user'

export default async function LaerOrdPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()

  if (!user) {
    return (
      <ListeningPageShell userEmail={null} isAdmin={false}>
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Lær ord</h1>
            <p className="text-gray-700">
              <Link href="/auth/login?next=/laer-ord" className="font-medium underline underline-offset-4">
                Logg inn
              </Link>{' '}
              for å se ordlistene dine. Elever ser ordlistene læreren har delt med gruppen deres.
            </p>
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={email} isAdmin={isAdmin}>
      <WordListOverview isTeacher={isTeacher} isAdmin={isAdmin} userId={user.id} />
    </ListeningPageShell>
  )
}
