import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-gray-200 bg-white py-8 text-vlfk-ink">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-gray-600">
            KI-verktøy for deg som lærer norsk: skriv, lytt, lær ord og øv på grammatikk.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/personvern" className="underline-offset-4 hover:underline">
                Personvern og GDPR
              </Link>
            </li>
            <li>
              <a
                href="mailto:rune.mikal.birkeland@vlfk.no"
                className="underline-offset-4 hover:underline"
              >
                Kontakt oss
              </a>
            </li>
          </ul>
        </div>

        <p className="mt-6 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Språkhjelp. Alle rettigheter reservert.
        </p>
      </div>
    </footer>
  )
}
