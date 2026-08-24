import SpraakhjelpperClient from './spraakhjelper-client'
import { getUser } from '@/lib/supabase/server'

export default async function SpraakhjelpperPage() {
  const user = await getUser()

  return (
    <SpraakhjelpperClient
      user={{
        id: user?.id ?? 'guest',
        email: user?.email ?? undefined,
      }}
    />
  )
}
