import { redirect } from 'next/navigation'
import { ChatbotImporter } from '@/components/snakkebot/importer'
import { getPageUser } from '@/lib/auth/page-user'

export const metadata = { title: 'Last opp snakkeboter - Språkhjelp' }

export default async function ImporterSnakkebotPage() {
  const { user, email, isAdmin } = await getPageUser()
  if (!user) redirect('/auth/login?next=/snakkebot/importer')
  // Only admins make chatbots; the API checks this again.
  if (!isAdmin) redirect('/snakkebot')
  return <ChatbotImporter userEmail={email} isAdmin={isAdmin} />
}
