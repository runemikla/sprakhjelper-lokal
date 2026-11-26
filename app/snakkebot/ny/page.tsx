import { redirect } from 'next/navigation'
import { ChatbotEditor } from '@/components/snakkebot/editor'
import { getPageUser } from '@/lib/auth/page-user'

export const metadata = { title: 'Ny snakkebot - Språkhjelp' }

export default async function NySnakkebotPage() {
  const { user, email, isAdmin } = await getPageUser()
  if (!user) redirect('/auth/login?next=/snakkebot/ny')
  // Only admins make chatbots.
  if (!isAdmin) redirect('/snakkebot')
  return <ChatbotEditor userEmail={email} isAdmin={isAdmin} />
}
