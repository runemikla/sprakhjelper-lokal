import LaerOrdClient from './laer-ord-client'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

export default async function LaerOrdPage() {
  const user = await getUser()
  const admin = await isAdmin(user)
  return <LaerOrdClient userEmail={user?.email ?? null} isAdmin={admin} />
}
