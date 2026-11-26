'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

// Server action behind the admin page «Brukere». The role is checked here,
// and again in the database function admin_set_user_role(), which also stops
// an admin from changing their own role.

export type ActionResult = { ok: true } | { ok: false; error: string }

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['student', 'teacher', 'admin']),
})

export async function setUserRole(input: { userId: string; role: 'student' | 'teacher' | 'admin' }): Promise<ActionResult> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }
  if (parsed.data.userId === user.id) return { ok: false, error: 'Du kan ikke endre din egen rolle.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  })
  if (error) {
    console.error('Set user role error:', error.message)
    return { ok: false, error: 'Kunne ikke endre rollen.' }
  }

  revalidatePath('/admin/brukere')
  return { ok: true }
}
