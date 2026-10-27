import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

// Guards admin-only server logic. Returns the user when they are an admin, or a
// ready-to-return NextResponse error otherwise.
export async function requireAdmin(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const user = await getUser()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Du må logge inn som administrator.',
        },
        { status: 401 }
      ),
    }
  }

  if (!(await isAdmin(user))) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Bare administratorer har tilgang.',
        },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}
