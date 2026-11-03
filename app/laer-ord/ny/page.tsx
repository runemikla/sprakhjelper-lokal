import { redirect } from 'next/navigation'
import { WordListEditor } from '@/components/ordlister/word-list-editor'
import { getPageUser } from '@/lib/auth/page-user'

export default async function NyOrdlistePage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()
  if (!user) redirect('/auth/login?next=/laer-ord/ny')
  if (!isTeacher) redirect('/laer-ord')
  return <WordListEditor userEmail={email} isAdmin={isAdmin} />
}
