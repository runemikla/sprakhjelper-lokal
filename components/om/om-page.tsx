import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { cn } from '@/lib/utils'
import { OM_SECTIONS, type OmSectionHref } from '@/components/om/sections'
import { FjordBackground, MobilePhotoCredit } from '@/components/landing/fjord-background'

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
      <FjordBackground mobileCredit={false} />

      <AppNavbar />

      <div className="relative z-10 container mx-auto px-2 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Om Språkhjelp" className="mb-6">
            <ul className="flex flex-wrap gap-x-2 border-b border-white/30">
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
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">{title}</h1>
            {intro ? <div className="text-lg text-gray-600 mb-8 max-w-3xl">{intro}</div> : null}
            {children}
          </div>
          <MobilePhotoCredit />
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  )
}
