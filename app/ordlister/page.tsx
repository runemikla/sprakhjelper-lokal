import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { TeacherOverview } from '@/components/ordlister/teacher-overview'

export default async function OrdlisterPage() {
  const user = await getUser()
  const admin = await isAdmin(user)
  return <TeacherOverview userEmail={user?.email ?? null} isAdmin={admin} />
}
