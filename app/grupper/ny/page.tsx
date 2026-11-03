import { redirect } from 'next/navigation'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { NewGroupClient } from '@/components/grupper/new-group'
import { getPageUser } from '@/lib/auth/page-user'

export default async function NyGruppePage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()
  if (!user) redirect('/auth/login?next=/grupper/ny')
  return (
    <ListeningPageShell userEmail={email} isAdmin={isAdmin}>
      <NewGroupClient isTeacher={isTeacher} />
    </ListeningPageShell>
  )
}
