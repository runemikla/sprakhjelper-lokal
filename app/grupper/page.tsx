import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { GroupsClient } from '@/components/grupper/groups-client'
import { getPageUser } from '@/lib/auth/page-user'

export default async function GrupperPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()

  if (!user) {
    return (
      <ListeningPageShell userEmail={null} isAdmin={false}>
        <PageHeader title="Grupper" description="Lærere lager grupper for klassen sin, og elever blir med i gruppen sin med en kode." />
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="space-y-4 pt-6">
            <p className="text-gray-700">Logg inn for å lage grupper (lærere) eller bli med i gruppen din (elever).</p>
            <Button asChild>
              <Link href="/auth/login?next=/grupper">Logg inn</Link>
            </Button>
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
