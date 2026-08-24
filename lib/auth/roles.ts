import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'teacher' | 'student'

export async function isTeacher(user: User | null): Promise<boolean> {
  if (!user) return false

  if (user.app_metadata?.role === 'teacher') {
    return true
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return false
  return data?.role === 'teacher'
}
