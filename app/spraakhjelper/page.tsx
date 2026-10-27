import SpraakhjelpperClient from './spraakhjelper-client'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

export default async function SpraakhjelpperPage() {
  const user = await getUser()
  const admin = await isAdmin(user)

  return (
    <SpraakhjelpperClient
      user={{
        id: user?.id ?? 'guest',
        email: user?.email ?? undefined,
      }}
      isAdmin={admin}
    />
  )
}
