import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { getUser } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login?next=/protected')
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hei <span>{user.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}
