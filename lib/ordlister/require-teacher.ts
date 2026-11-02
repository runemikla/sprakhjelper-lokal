import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isTeacher } from '@/lib/auth/roles'

// The generation routes cost money (language model, image model, TTS), so
// only logged-in teachers and admins may call them.
export async function requireTeacher(): Promise<NextResponse | null> {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Du må logge inn som lærer.' }, { status: 401 })
  }
  if (!(await isTeacher(user))) {
    return NextResponse.json({ error: 'Bare lærere kan lage ordlister.' }, { status: 403 })
  }
  return null
}
