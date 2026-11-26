import { AdminIntro, AdminNotice } from '@/components/admin/admin-intro'
import { ForbrukDashboard, type CallRow, type DailyRow } from '@/components/admin/forbruk/forbruk-dashboard'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import { createClient } from '@/lib/supabase/server'

// Admin pages always show the latest numbers.
export const dynamic = 'force-dynamic'

const ALLOWED_DAYS = [7, 30, 90]

// The most recent calls shown in the table.
const CALL_LIMIT = 500

function osloToday(): string {
  // en-CA gives YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(new Date())
}

export default async function ForbrukPage({ searchParams }: { searchParams: Promise<{ dager?: string }> }) {
  await requireAdminPage('/admin/forbruk')
  const requested = Number((await searchParams).dager)
  const days = ALLOWED_DAYS.includes(requested) ? requested : 30

  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const [dailyResult, callsResult] = await Promise.all([
    // Twice the period, so the cards can compare with the period before.
    supabase.rpc('ai_usage_daily', { p_days: days * 2 }),
    supabase
      .from('ai_usage')
      .select('id, created_at, tool, provider, model, kind, input_tokens, cached_tokens, output_tokens, units, ok')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(CALL_LIMIT),
  ])

  if (dailyResult.error || callsResult.error) {
    console.error('Forbruk:', dailyResult.error?.message ?? callsResult.error?.message)
    return (
      <div className="space-y-6">
        <AdminIntro title="Forbruk" description="Tokens og kall til språkmodellene, bilder og lyd." />
        <AdminNotice>
          Fant ikke forbruksloggen i databasen. Kjør migrasjonen for forbruk og brukere i Supabase, så begynner
          Språkhjelp å logge hvert KI-kall. Tallene vises her fra da av.
        </AdminNotice>
      </div>
    )
  }

  // Postgres bigint sums come back as numbers or strings; make them numbers.
  const daily: DailyRow[] = ((dailyResult.data ?? []) as Record<string, unknown>[]).map((r) => ({
    day: String(r.day),
    tool: String(r.tool),
    provider: String(r.provider),
    model: String(r.model),
    kind: String(r.kind),
    calls: Number(r.calls) || 0,
    input_tokens: Number(r.input_tokens) || 0,
    cached_tokens: Number(r.cached_tokens) || 0,
    output_tokens: Number(r.output_tokens) || 0,
    units: Number(r.units) || 0,
  }))

  return <ForbrukDashboard days={days} today={osloToday()} daily={daily} calls={(callsResult.data ?? []) as CallRow[]} />
}
