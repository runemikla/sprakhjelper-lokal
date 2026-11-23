import type { ReactNode } from 'react'
import { FjordPageShell } from '@/components/landing/fjord-page-shell'

interface ListeningPageShellProps {
  userEmail?: string | null
  // Forwarded to the navbar so admins see the "Instrukser" menu entry.
  isAdmin?: boolean
  children: ReactNode
}

export function ListeningPageShell({
  userEmail = null,
  isAdmin = false,
  children,
}: ListeningPageShellProps) {
  return (
    <FjordPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <div className="space-y-8">{children}</div>
    </FjordPageShell>
  )
}
