import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'teacher' | 'student' | 'admin'

// Returns true when the user is an admin. Admins can view the AI tool
// instructions. Honors app_metadata.role (set in the Supabase dashboard) before
// falling back to the profiles.role column.
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) return false

  if (user.app_metadata?.role === 'admin') {
    return true
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return false
  return data?.role === 'admin'
}

// Returns true when the user is a teacher. Admins keep teacher capabilities, so
// they are treated as teachers here as well. Honors app_metadata.role before
// falling back to the profiles.role column.
export async function isTeacher(user: User | null): Promise<boolean> {
  if (!user) return false

  const metadataRole = user.app_metadata?.role
  if (metadataRole === 'teacher' || metadataRole === 'admin') {
    return true
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return false
  return data?.role === 'teacher' || data?.role === 'admin'
}
