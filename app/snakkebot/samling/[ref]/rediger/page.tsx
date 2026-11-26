import { redirect } from 'next/navigation'
import { CollectionEditor } from '@/components/snakkebot/collection-editor'
import { getPageUser } from '@/lib/auth/page-user'
import { isUuid } from '@/lib/snakkebot/types'

export const metadata = { title: 'Rediger samling - Språkhjelp' }

export default async function RedigerSamlingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const { user, email, isAdmin } = await getPageUser()
  if (!user) redirect(`/auth/login?next=/snakkebot/samling/${ref}/rediger`)
  if (!isAdmin || !isUuid(ref)) redirect('/snakkebot')
  return <CollectionEditor userEmail={email} isAdmin={isAdmin} collectionId={ref.toLowerCase()} />
}
