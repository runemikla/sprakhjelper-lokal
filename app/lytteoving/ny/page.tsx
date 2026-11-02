import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { isTeacher, isAdmin } from '@/lib/auth/roles'
import { CreateListeningClient } from './lytteoving-create-client'

export default async function NyLytteovingPage() {
  const user = await getUser()
  const teacher = await isTeacher(user)

  if (!teacher) {
    redirect('/lytteoving')
  }

  const admin = await isAdmin(user)

  return <CreateListeningClient userEmail={user?.email ?? null} isAdmin={admin} />
}
