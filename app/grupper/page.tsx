import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { GroupsClient } from '@/components/grupper/groups-client'
import { getPageUser } from '@/lib/auth/page-user'

export default async function GrupperPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()

  if (!user) {
    return (
      <ListeningPageShell userEmail={null} isAdmin={false}>
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Grupper</h1>
            <p className="text-gray-700">
              <Link href="/auth/login?next=/grupper" className="font-medium underline underline-offset-4">
                Logg inn
              </Link>{' '}
              for å lage grupper (lærere) eller bli med i gruppen din (elever).
            </p>
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={email} isAdmin={isAdmin}>
      <GroupsClient isTeacher={isTeacher} isAdmin={isAdmin} />
    </ListeningPageShell>
  )
}
