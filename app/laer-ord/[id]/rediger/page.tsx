import { redirect } from 'next/navigation'
import { WordListEditor } from '@/components/ordlister/word-list-editor'
import { getPageUser } from '@/lib/auth/page-user'

interface RedigerOrdlistePageProps {
  params: Promise<{ id: string }>
}

export default async function RedigerOrdlistePage({ params }: RedigerOrdlistePageProps) {
  const { id } = await params
  const { user, email, isAdmin, isTeacher } = await getPageUser()
  if (!user) redirect(`/auth/login?next=/laer-ord/${encodeURIComponent(id)}/rediger`)
  if (!isTeacher) redirect(`/laer-ord/${encodeURIComponent(id)}`)
  return <WordListEditor key={id} listId={id} userEmail={email} isAdmin={isAdmin} />
}
