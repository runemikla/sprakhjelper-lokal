'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

// The four tools, in the order they appear on the cards.
export const VERKTOY = [
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

// The tools as picture cards: two columns on larger screens, compact rows
// with a thumbnail on phones. Used on the student home and the visitor front page.
export function VerktoyKort() {
  const router = useRouter()

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {VERKTOY.map((tool) => (
        <li key={tool.href}>
          <Link
            href={tool.href}
            onClick={(event) => {
              if (!tool.clearsSession) return
              event.preventDefault()
              sessionStorage.clear()
              router.push(tool.href)
            }}
            className="group flex sm:block items-center rounded-xl border border-gray-200 bg-white overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vlfk-ink"
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
                <span className="block text-lg font-semibold text-vlfk-ink">{tool.title}</span>
                <span className="hidden sm:block text-sm text-gray-500">{tool.subtitle}</span>
              </span>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-vlfk-ink transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
