import { getUser } from '@/lib/supabase/server'
import { isAdmin, isTeacher } from '@/lib/auth/roles'

// The signed-in user and roles, for pages that render the navbar.
export async function getPageUser() {
  const user = await getUser()
  const [admin, teacher] = user ? await Promise.all([isAdmin(user), isTeacher(user)]) : [false, false]
  // Students: signed in, but neither teacher nor admin.
  const student = Boolean(user) && !teacher && !admin
  return { user, email: user?.email ?? null, isAdmin: admin, isTeacher: teacher, isStudent: student }
}
