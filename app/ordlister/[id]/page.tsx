import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { WordListEditor } from '@/components/ordlister/word-list-editor'

interface RedigerOrdlistePageProps {
  params: Promise<{ id: string }>
}

export default async function RedigerOrdlistePage({ params }: RedigerOrdlistePageProps) {
  const { id } = await params
  const user = await getUser()
  const admin = await isAdmin(user)
  return <WordListEditor key={id} listId={id} userEmail={user?.email ?? null} isAdmin={admin} />
}
