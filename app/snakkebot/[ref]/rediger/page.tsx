import { redirect } from 'next/navigation'
import { ChatbotEditor } from '@/components/snakkebot/editor'
import { getPageUser } from '@/lib/auth/page-user'
import { isUuid } from '@/lib/snakkebot/types'

export const metadata = { title: 'Rediger snakkebot - Språkhjelp' }

export default async function RedigerSnakkebotPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const { user, email, isAdmin } = await getPageUser()
  if (!user) redirect(`/auth/login?next=/snakkebot/${ref}/rediger`)
  if (!isAdmin || !isUuid(ref)) redirect('/snakkebot')
  return <ChatbotEditor userEmail={email} isAdmin={isAdmin} chatbotId={ref.toLowerCase()} />
}
