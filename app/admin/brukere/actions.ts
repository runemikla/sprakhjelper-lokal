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

export interface UserContent {
  wordLists: number
  groups: number
  groupMemberships: number
  chatbots: number
  chatbotCollections: number
  listeningExercises: number
}

type ContentRow = {
  word_lists: number
  groups: number
  group_memberships: number
  chatbots: number
  chatbot_collections: number
  listening_exercises: number
  word_list_ids: string[] | null
}

const idSchema = z.string().uuid()

async function loadContent(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_user_content', { p_user_id: userId })
  if (error) throw new Error(error.message)
  const row = (Array.isArray(data) ? data[0] : data) as ContentRow | undefined
  return { supabase, row }
}

/** What will be deleted together with the user, shown in the confirmation. */
export async function getUserContent(userId: string): Promise<{ ok: true; content: UserContent } | { ok: false; error: string }> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return { ok: false, error: 'Bare administratorer har tilgang.' }
  if (!idSchema.safeParse(userId).success) return { ok: false, error: 'Ugyldig input' }
  try {
    const { row } = await loadContent(userId)
    return {
      ok: true,
      content: {
        wordLists: Number(row?.word_lists) || 0,
        groups: Number(row?.groups) || 0,
        groupMemberships: Number(row?.group_memberships) || 0,
        chatbots: Number(row?.chatbots) || 0,
        chatbotCollections: Number(row?.chatbot_collections) || 0,
        listeningExercises: Number(row?.listening_exercises) || 0,
      },
    }
  } catch (error) {
    console.error('User content error:', error instanceof Error ? error.message : error)
    return { ok: false, error: 'Kunne ikke hente hva brukeren har laget.' }
  }
}

/**
 * Deletes a user and everything they made. The word list files are removed
 * from storage first (the database cascades do not reach storage), then
 * admin_delete_user() deletes the account. Admins cannot be deleted.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return { ok: false, error: 'Bare administratorer har tilgang.' }
  if (!idSchema.safeParse(userId).success) return { ok: false, error: 'Ugyldig input' }
  if (userId === user.id) return { ok: false, error: 'Du kan ikke slette deg selv.' }

  try {
    const { supabase, row } = await loadContent(userId)
    for (const listId of row?.word_list_ids ?? []) {
      const { data } = await supabase.storage.from('word-lists').list(listId, { limit: 1000 })
      if (data?.length) {
        const { error } = await supabase.storage.from('word-lists').remove(data.map((f) => `${listId}/${f.name}`))
        if (error) console.error('Delete user files error:', error.message)
      }
    }

    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
    if (error) {
      console.error('Delete user error:', error.message)
      if (/cannot delete an admin/.test(error.message)) {
        return { ok: false, error: 'Administratorer kan ikke slettes. Endre rollen først.' }
      }
      return { ok: false, error: 'Kunne ikke slette brukeren.' }
    }
  } catch (error) {
    console.error('Delete user error:', error instanceof Error ? error.message : error)
    return { ok: false, error: 'Kunne ikke slette brukeren.' }
  }

  revalidatePath('/admin/brukere')
  return { ok: true }
}
