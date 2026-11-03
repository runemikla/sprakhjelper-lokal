import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { cn } from '@/lib/utils'
import { OM_SECTIONS, type OmSectionHref } from '@/components/om/sections'

interface OmPageProps {
  current: OmSectionHref
  title: string
  intro?: ReactNode
  children: ReactNode
}

// Shared shell for the pages under «Om Språkhjelp»: fjord background like the
// tools, tabs between the four pages, and the content on a white panel.
export function OmPage({ current, title, intro, children }: OmPageProps) {
  return (
    <main className="relative min-h-screen">
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
        <div className="absolute bottom-4 right-4 z-10 rounded bg-black/20 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm">
          Foto: Silje Alvsaker / Vestland fylkeskommune
        </div>
      </div>

      <AppNavbar />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Om Språkhjelp" className="mb-6 -mx-4 px-4 overflow-x-auto">
            <ul className="flex gap-2 min-w-max border-b border-white/30">
              {OM_SECTIONS.map((section) => {
                const active = section.href === current
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-block px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                        active
                          ? 'border-white text-white'
                          : 'border-transparent text-white/75 hover:text-white'
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{title}</h1>
            {intro ? <div className="text-lg text-gray-600 mb-8 max-w-3xl">{intro}</div> : null}
            {children}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  )
}
