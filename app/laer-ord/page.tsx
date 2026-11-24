import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { WordListOverview } from '@/components/laer-ord/overview'
import { getPageUser } from '@/lib/auth/page-user'

export default async function LaerOrdPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()

  if (!user) {
    return (
      <ListeningPageShell userEmail={null} isAdmin={false}>
        <PageHeader title="Lær ord" description="Lær nye ord med bilde, lyd og setninger." />
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="space-y-4 pt-6">
            <p className="text-gray-700">Logg inn for å se ordlistene dine. Elever ser ordlistene læreren har delt med gruppen deres.</p>
            <Button asChild>
              <Link href="/auth/login?next=/laer-ord">Logg inn</Link>
            </Button>
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
