'use client'

import Link from 'next/link'
import { Navbar } from '@/components/landing/navbar'
import { FjordBackground } from '@/components/landing/fjord-background'
import { VerktoyKort } from '@/components/landing/verktoy-kort'

// Backgrounds for the word list shortcuts, from the county's profile colours.
const LIST_COLORS = ['#9ADBE8', '#B7DD79', '#FDDA25', '#F8B5C4', '#CAA2DD', '#3CDBC0']

interface StudentHomeProps {
  userEmail: string | null
  // Word lists shared with the student's groups (newest first).
  wordLists: { id: string; title: string }[]
}

// The start page for a signed-in student: the tools as picture cards, and
// shortcuts to the word lists the student's groups have been given.
export function StudentHome({ userEmail, wordLists }: StudentHomeProps) {
  return (
    <div className="relative min-h-screen">
      <FjordBackground />

      <Navbar userEmail={userEmail} />

      <main className="relative z-10 container mx-auto max-w-4xl px-2 sm:px-4 pt-24 pb-12">
        <section className="rounded-2xl bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl p-5 sm:p-8">
          <h1 className="text-3xl font-semibold text-gray-900">Hei!</h1>
          <p className="mt-1 mb-6 text-gray-600">Velg hva du vil øve på i dag.</p>

          <VerktoyKort />

          <div className="mt-6 border-t border-gray-200 pt-5">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Ordlister fra gruppene dine</h2>
            {wordLists.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {wordLists.map((list, index) => (
                  <li key={list.id}>
                    <Link
                      href={`/laer-ord/${list.id}`}
                      className="inline-block rounded-full px-3 py-1.5 text-sm font-medium text-gray-900 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                      style={{ backgroundColor: LIST_COLORS[index % LIST_COLORS.length] }}
                    >
                      {list.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">
                Ingen ordlister ennå. Har du fått en kode fra læreren?{' '}
                <Link href="/grupper" className="font-medium text-vlfk-ink underline underline-offset-4">
                  Bli med i gruppen din
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
