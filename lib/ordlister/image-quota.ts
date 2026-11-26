import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

// How many pictures a teacher can have made for word lists per 24 hours.
// The same number is set in claim_image_generation() in
// supabase/migrations/20261126180000_create_image_generations.sql, which is
// what actually enforces it. Admins have no limit.
export const IMAGE_LIMIT_PER_DAY = 40

export type ImageQuota =
  | { limited: false }
  | { limited: true; limit: number; used: number; remaining: number }

// The caller's quota, for showing in the editor. Unknown (no table yet,
// not logged in) counts as not limited.
export async function getImageQuota(): Promise<ImageQuota> {
  const user = await getUser()
  if (!user || (await isAdmin(user))) return { limited: false }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('image_generations_used')
  if (error || typeof data !== 'number') return { limited: false }
  return {
    limited: true,
    limit: IMAGE_LIMIT_PER_DAY,
    used: data,
    remaining: Math.max(0, IMAGE_LIMIT_PER_DAY - data),
  }
}

// Logs one picture for the caller. Returns false when the teacher has
// reached the limit. Admins are not logged. If the database function is
// missing (migration not applied), the picture is let through.
export async function claimImage(): Promise<boolean> {
  const user = await getUser()
  if (!user || (await isAdmin(user))) return true
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('claim_image_generation')
  if (error) {
    console.error('ordlister/bilde: claim_image_generation:', error.message)
    return true
  }
  return data !== -1
}
