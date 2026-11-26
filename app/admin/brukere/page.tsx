import { AdminIntro, AdminNotice } from '@/components/admin/admin-intro'
import { UserTable, type AdminUser } from '@/components/admin/brukere/user-table'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import { createClient } from '@/lib/supabase/server'

// Admin pages always show the latest users.
export const dynamic = 'force-dynamic'

export default async function BrukerePage() {
  const { user } = await requireAdminPage('/admin/brukere')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_users')

  if (error) {
    console.error('Brukere:', error.message)
    return (
      <div className="space-y-6">
        <AdminIntro title="Brukere" description="Alle som har konto i Språkhjelp, og hvilken rolle de har." />
        <AdminNotice>
          Fant ikke brukeroversikten i databasen. Kjør migrasjonen for forbruk og brukere i Supabase, så vises
          brukerne her.
        </AdminNotice>
      </div>
    )
  }

  const users = ((data ?? []) as Record<string, unknown>[]).map(
    (r): AdminUser => ({
      id: String(r.id),
      email: (r.email as string | null) ?? '',
      firstName: (r.first_name as string | null) ?? null,
      role: r.role === 'admin' || r.role === 'teacher' ? r.role : 'student',
      createdAt: String(r.created_at),
      lastSignInAt: (r.last_sign_in_at as string | null) ?? null,
      confirmed: Boolean(r.confirmed),
      groupCount: Number(r.group_count) || 0,
    })
  )

  return <UserTable users={users} currentUserId={user!.id} />
}
