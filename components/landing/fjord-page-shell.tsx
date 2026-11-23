import type { ReactNode } from 'react'
import { Navbar } from '@/components/landing/navbar'
import { cn } from '@/lib/utils'
import { FjordBackground } from '@/components/landing/fjord-background'

interface FjordPageShellProps {
  userEmail?: string | null
  // Forwarded to the navbar so admins see the "Instrukser" menu entry.
  isAdmin?: boolean
  // Tailwind max-width for the content column.
  maxWidth?: string
  children: ReactNode
}

// Shared page frame with the Aurlandsfjorden background used by the tools.
export function FjordPageShell({
  userEmail = null,
  isAdmin = false,
  maxWidth = 'max-w-4xl',
  children,
}: FjordPageShellProps) {
  return (
    <div className="relative min-h-screen">
      <FjordBackground />

      <Navbar userEmail={userEmail} isAdmin={isAdmin} />

      <div className={cn('relative z-10 container mx-auto pt-24 pb-12 px-4', maxWidth)}>
        {children}
      </div>
    </div>
  )
}
