import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { isTeacher } from '@/lib/auth/roles'
import { CreateListeningClient } from './lytteoving-create-client'

export default async function NyLytteovingPage() {
  const user = await getUser()
  const teacher = await isTeacher(user)

  if (!teacher) {
    redirect('/lytteoving')
  }

  return <CreateListeningClient userEmail={user?.email ?? null} />
}
