import { notFound } from 'next/navigation'
import { CollectionPicker } from '@/components/snakkebot/collection-picker'
import { getPageUser } from '@/lib/auth/page-user'
import { loadCollection } from '@/lib/snakkebot/server'
import { parseCollectionRef } from '@/lib/snakkebot/types'

export const metadata = { title: 'Snakkebot - Språkhjelp' }

// /snakkebot/samling/<id> for group members, teachers and admins,
// /snakkebot/samling/<KODE> for anyone with the code (no login needed).
export default async function SamlingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: raw } = await params
  const ref = parseCollectionRef(raw)
  if (!ref) notFound()

  const { email, isAdmin, isTeacher } = await getPageUser()
  const collection = await loadCollection(ref).catch(() => null)
  if (!collection) notFound()

  return (
    <CollectionPicker
      userEmail={email}
      isAdmin={isAdmin}
      collection={collection}
      collectionRef={ref}
      editHref={isAdmin ? `/snakkebot/samling/${collection.id}/rediger` : null}
      showCode={isAdmin || isTeacher}
    />
  )
}
