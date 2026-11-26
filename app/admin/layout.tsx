import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { requireAdminPage } from '@/lib/auth/require-admin-page'

export const metadata: Metadata = {
  title: 'Admin – Språkhjelp',
  robots: { index: false, follow: false },
}

// Admin area with its own sidebar menu. Only admins get in; every page also
// checks this itself (see requireAdminPage).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { email } = await requireAdminPage('/admin')
  return <AdminShell email={email ?? ''}>{children}</AdminShell>
}
