import { redirect } from 'next/navigation'
import { getPageUser } from '@/lib/auth/page-user'

// Server-side guard for the admin pages. Hiding the menu item is not enough,
// and the layout is not rendered again on every navigation, so each page
// calls this itself.
export async function requireAdminPage(path: string) {
  const pageUser = await getPageUser()
  if (!pageUser.user) redirect(`/auth/login?next=${encodeURIComponent(path)}`)
  if (!pageUser.isAdmin) redirect('/')
  return pageUser
}
