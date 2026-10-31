import { notFound } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { StudentView } from '@/components/ordlister/student-view'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/ordlister/types'

interface ElevOrdlistePageProps {
  params: Promise<{ kode: string }>
}

export default async function ElevOrdlistePage({ params }: ElevOrdlistePageProps) {
  const { kode } = await params
  const code = normalizeAccessCode(kode)
  if (!isValidAccessCode(code)) notFound()

  const user = await getUser()
  const admin = await isAdmin(user)
  return <StudentView code={code} userEmail={user?.email ?? null} isAdmin={admin} />
}
