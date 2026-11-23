import type { ReactNode } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/landing/navbar'
import { cn } from '@/lib/utils'

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
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/Aurlandsfjorden-blaa.jpg"
          alt="Aurlandsfjorden bakgrunn"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-cyan-700/50" />
        <div className="absolute bottom-4 right-4 text-white/70 text-xs bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded z-10">
          Foto: Silje Alvsaker / Vestland fylkeskommune
        </div>
      </div>

      <Navbar userEmail={userEmail} isAdmin={isAdmin} />

      <div className={cn('relative z-10 container mx-auto pt-24 pb-12 px-4', maxWidth)}>
        {children}
      </div>
    </div>
  )
}
