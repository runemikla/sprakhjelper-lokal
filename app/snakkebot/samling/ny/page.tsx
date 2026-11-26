import { redirect } from 'next/navigation'
import { CollectionEditor } from '@/components/snakkebot/collection-editor'
import { getPageUser } from '@/lib/auth/page-user'

export const metadata = { title: 'Ny samling - Språkhjelp' }

export default async function NySamlingPage() {
  const { user, email, isAdmin } = await getPageUser()
  if (!user) redirect('/auth/login?next=/snakkebot/samling/ny')
  // Only admins make collections, like chatbots.
  if (!isAdmin) redirect('/snakkebot')
  return <CollectionEditor userEmail={email} isAdmin={isAdmin} />
}
