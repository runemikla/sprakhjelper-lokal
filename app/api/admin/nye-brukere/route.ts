import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'

// How many users have signed up since this admin last opened /admin/brukere,
// for the badge at «Admin» in the top bar and at «Brukere» in the admin menu.
// Gives 0 (no badge) if anything is missing, such as the migration.
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) {
    return NextResponse.json({ error: 'Bare administratorer har tilgang.' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_new_users_count')
  if (error) console.error('New users count:', error.message)
  const count = error ? 0 : Math.max(0, Number(data) || 0)

  return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
}
