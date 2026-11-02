import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { WordListEditor } from '@/components/ordlister/word-list-editor'

export default async function NyOrdlistePage() {
  const user = await getUser()
  const admin = await isAdmin(user)
  return <WordListEditor userEmail={user?.email ?? null} isAdmin={admin} />
}
