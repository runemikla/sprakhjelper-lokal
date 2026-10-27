import { Navbar } from '@/components/landing/navbar'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

export async function AppNavbar() {
  const user = await getUser()
  const admin = await isAdmin(user)
  return <Navbar userEmail={user?.email ?? null} isAdmin={admin} />
}
