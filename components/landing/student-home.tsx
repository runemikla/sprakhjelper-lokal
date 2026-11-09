'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'

// The four tools a student can open, in the order they appear on the cards.
const STUDENT_TOOLS = [
  {
    href: '/spraakhjelper',
    title: 'Skrivehjelp',
    subtitle: 'Skriv og få hjelp',
    image: '/images/verktoy/skrivehjelp.webp',
    // Skrivehjelp keeps its state in sessionStorage; a fresh start clears it.
    clearsSession: true,
  },
  {
    href: '/lytteoving',
    title: 'Lytteøving',
    subtitle: 'Lytt og svar',
    image: '/images/verktoy/lytteoving.webp',
    clearsSession: false,
  },
  {
    href: '/laer-ord',
    title: 'Lær ord',
    subtitle: 'Øv på ordlister',
    image: '/images/verktoy/laer-ord.webp',
    clearsSession: false,
  },
  {
    href: '/grammatikk',
    title: 'Grammatikkøving',
    subtitle: 'Bygg setninger',
    image: '/images/verktoy/grammatikk.webp',
    clearsSession: false,
  },
] as const

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
  const router = useRouter()

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

      <main className="relative z-10 container mx-auto max-w-4xl px-4 pt-24 pb-12">
        <section className="rounded-2xl bg-white/95 backdrop-blur-sm border border-white/20 shadow-xl p-5 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900">Hei!</h1>
          <p className="mt-1 mb-6 text-gray-600">Velg hva du vil øve på i dag.</p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STUDENT_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  onClick={(event) => {
                    if (!tool.clearsSession) return
                    event.preventDefault()
                    sessionStorage.clear()
                    router.push(tool.href)
                  }}
                  className="group flex sm:block items-center rounded-xl border border-gray-200 bg-white overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                >
                  <Image
                    src={tool.image}
                    alt=""
                    width={800}
                    height={597}
                    sizes="(min-width: 640px) 400px, 96px"
                    className="h-24 w-24 sm:h-auto sm:w-full shrink-0 object-cover sm:aspect-[4/3]"
                  />
                  <span className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
                    <span>
                      <span className="block text-lg font-bold text-gray-900">{tool.title}</span>
                      <span className="hidden sm:block text-sm text-gray-500">{tool.subtitle}</span>
                    </span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-gray-900 transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

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
                <Link href="/grupper" className="font-medium text-blue-700 underline underline-offset-4">
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
