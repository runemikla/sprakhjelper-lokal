import type { ReactNode } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/landing/navbar'

interface ListeningPageShellProps {
  userEmail?: string | null
  children: ReactNode
}

export function ListeningPageShell({
  userEmail = null,
  children,
}: ListeningPageShellProps) {
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

      <Navbar userEmail={userEmail} />

      <div className="relative z-10 container mx-auto pt-24 pb-8 px-4 max-w-4xl">
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  )
}
