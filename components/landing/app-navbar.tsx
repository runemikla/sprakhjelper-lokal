import { Navbar } from '@/components/landing/navbar'
import { getUser } from '@/lib/supabase/server'

export async function AppNavbar() {
  const user = await getUser()
  return <Navbar userEmail={user?.email ?? null} />
}
