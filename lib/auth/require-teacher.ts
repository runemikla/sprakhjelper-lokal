import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getUser } from '@/lib/supabase/server'
import { isTeacher } from '@/lib/auth/roles'

export async function requireTeacher(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const user = await getUser()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Du må logge inn som lærer for å lage lytteøvinger.',
        },
        { status: 401 }
      ),
    }
  }

  if (!(await isTeacher(user))) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Bare lærere kan lage lytteøvinger.',
        },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}
