'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { isInstructionKey } from '@/lib/ai/instructions'
import { clearInstructionCache } from '@/lib/ai/instruction-store'

// Server actions behind the admin "Instrukser" page. Every action re-checks the
// admin role here, and the database policies on instruction_versions check it
// again (public.is_admin()).

export type ActionResult = { ok: true } | { ok: false; error: string }

const keySchema = z.string().refine(isInstructionKey, 'Ukjent instruks')

const createSchema = z.object({
  instructionKey: keySchema,
  name: z.string().trim().min(1, 'Gi versjonen et navn').max(200, 'Navnet er for langt'),
  content: z
    .string()
    .refine((value) => value.trim().length > 0, 'Instruksen kan ikke være tom')
    .refine((value) => value.length <= 100_000, 'Instruksen er for lang'),
  activate: z.boolean(),
})

async function ensureAdmin(): Promise<string | null> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return null
  return user.id
}

function done(instructionKey: string): ActionResult {
  if (isInstructionKey(instructionKey)) clearInstructionCache(instructionKey)
  revalidatePath('/instrukser')
  return { ok: true }
}

export async function createInstructionVersion(input: {
  instructionKey: string
  name: string
  content: string
  activate: boolean
}): Promise<ActionResult> {
  const userId = await ensureAdmin()
  if (!userId) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Ugyldig input' }
  }

  const { instructionKey, name, content, activate } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('instruction_versions')
    .insert({ instruction_key: instructionKey, name, content, created_by: userId })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Create instruction version error:', error?.message)
    return { ok: false, error: 'Kunne ikke lagre versjonen.' }
  }

  if (activate) {
    const { error: activateError } = await supabase.rpc('activate_instruction_version', {
      p_instruction_key: instructionKey,
      p_version_id: data.id,
    })
    if (activateError) {
      console.error('Activate instruction version error:', activateError.message)
      revalidatePath('/instrukser')
      return { ok: false, error: 'Versjonen ble lagret, men kunne ikke tas i bruk.' }
    }
  }

  return done(instructionKey)
}

// versionId null switches the tool back to the built-in default.
export async function activateInstructionVersion(input: {
  instructionKey: string
  versionId: string | null
}): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = z
    .object({ instructionKey: keySchema, versionId: z.string().uuid().nullable() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('activate_instruction_version', {
    p_instruction_key: parsed.data.instructionKey,
    p_version_id: parsed.data.versionId,
  })

  if (error) {
    console.error('Activate instruction version error:', error.message)
    return { ok: false, error: 'Kunne ikke bytte versjon.' }
  }

  return done(parsed.data.instructionKey)
}

export async function deleteInstructionVersion(input: {
  instructionKey: string
  versionId: string
}): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = z
    .object({ instructionKey: keySchema, versionId: z.string().uuid() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }

  const supabase = await createClient()
  // The active version cannot be deleted; switch to another version first.
  const { data, error } = await supabase
    .from('instruction_versions')
    .delete()
    .eq('id', parsed.data.versionId)
    .eq('is_active', false)
    .select('id')

  if (error) {
    console.error('Delete instruction version error:', error.message)
    return { ok: false, error: 'Kunne ikke slette versjonen.' }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Versjonen er i bruk eller finnes ikke. Bytt til en annen versjon først.' }
  }

  return done(parsed.data.instructionKey)
}
