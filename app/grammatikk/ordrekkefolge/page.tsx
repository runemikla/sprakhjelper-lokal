import OrdrekkefolgeClient from './ordrekkefolge-client'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

export default async function OrdrekkefolgePage() {
  const user = await getUser()
  const admin = await isAdmin(user)
  return <OrdrekkefolgeClient userEmail={user?.email ?? null} isAdmin={admin} />
}
