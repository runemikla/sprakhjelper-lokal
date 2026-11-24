import { redirect } from 'next/navigation'
import { ChatbotEditor } from '@/components/snakkebot/editor'
import { getPageUser } from '@/lib/auth/page-user'

export const metadata = { title: 'Ny snakkebot - Språkhjelp' }

export default async function NySnakkebotPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()
  if (!user) redirect('/auth/login?next=/snakkebot/ny')
  if (!isTeacher) redirect('/snakkebot')
  return <ChatbotEditor userEmail={email} isAdmin={isAdmin} />
}
