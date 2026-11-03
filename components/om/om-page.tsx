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

// Shared shell for the pages under «Om Språkhjelp»: navbar, tabs between the
// four pages, a heading and the page content.
export function OmPage({ current, title, intro, children }: OmPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 mt-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Om Språkhjelp
          </p>
          <nav aria-label="Om Språkhjelp" className="mb-10 -mx-4 px-4 overflow-x-auto">
            <ul className="flex gap-2 min-w-max border-b border-gray-200">
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
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-600 hover:text-blue-600'
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          {intro ? <div className="text-lg text-gray-600 mb-10 max-w-3xl">{intro}</div> : null}

          {children}
        </div>
      </div>

      <Footer />
    </main>
  )
}
