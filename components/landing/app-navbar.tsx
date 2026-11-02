import { Navbar } from '@/components/landing/navbar'
import { getPageUser } from '@/lib/auth/page-user'

export async function AppNavbar() {
  const { email, isAdmin } = await getPageUser()
  return <Navbar userEmail={email} isAdmin={isAdmin} />
}
