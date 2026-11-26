'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { clearAvailableVoicesCache } from '@/lib/tts/available-voices'
import { isValidVoiceId, voiceIdOf } from '@/lib/tts/voices'

// Server actions behind the admin page «Stemmer». The role is checked here,
// and the database policies on tts_voices check it again (public.is_admin()).

export type ActionResult = { ok: true } | { ok: false; error: string }

const schema = z.object({
  googleName: z.string().trim().regex(/^nb-NO-[A-Za-z0-9-]{1,60}$/, 'Ukjent stemme'),
  gender: z.enum(['kvinne', 'mann', 'nøytral']).nullable(),
  available: z.boolean(),
})

export async function setVoiceAvailable(input: {
  googleName: string
  gender: 'kvinne' | 'mann' | 'nøytral' | null
  available: boolean
}): Promise<ActionResult> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }
  const { googleName, gender, available } = parsed.data
  const voiceId = voiceIdOf(googleName)
  if (!isValidVoiceId(voiceId)) return { ok: false, error: 'Ukjent stemme' }

  const supabase = await createClient()
  if (available) {
    const { error } = await supabase
      .from('tts_voices')
      .upsert({ voice_id: voiceId, google_name: googleName, gender, created_by: user.id }, { onConflict: 'voice_id' })
    if (error) {
      console.error('Add TTS voice error:', error.message)
      return { ok: false, error: 'Kunne ikke lagre stemmen.' }
    }
  } else {
    // At least one voice must stay, or the tools would have nothing to offer.
    const { count } = await supabase.from('tts_voices').select('voice_id', { count: 'exact', head: true })
    if ((count ?? 0) <= 1) return { ok: false, error: 'Minst én stemme må være tilgjengelig.' }
    const { error } = await supabase.from('tts_voices').delete().eq('voice_id', voiceId)
    if (error) {
      console.error('Remove TTS voice error:', error.message)
      return { ok: false, error: 'Kunne ikke fjerne stemmen.' }
    }
  }

  clearAvailableVoicesCache()
  revalidatePath('/admin/stemmer')
  return { ok: true }
}
