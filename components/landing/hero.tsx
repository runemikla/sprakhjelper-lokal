import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FjordBackground } from '@/components/landing/fjord-background'
import { VerktoyKort } from '@/components/landing/verktoy-kort'

// Front page for everyone who is not a signed-in student: the four tools as
// picture cards, and a way to sign in.
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative">
      {/* On phones the white panel fills the screen, so the photo is not shown. */}
      <FjordBackground mobileCredit={false} />

      <div className="relative z-10 container mx-auto max-w-4xl px-0 pt-16 sm:px-4 sm:pt-28 sm:pb-16">
        <div className="bg-white p-4 sm:rounded-2xl sm:bg-white/95 sm:p-8 sm:shadow-xl sm:backdrop-blur-sm">
          <VerktoyKort />

          <div className="mt-6 flex flex-col gap-4 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {signedIn ? (
              <p className="text-gray-600">
                Les om hvordan du bruker verktøyene i undervisningen.
              </p>
            ) : (
              <p className="text-gray-600">
                Logg inn for å bruke ordlistene og gruppene fra læreren din.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {!signedIn && (
                <Button asChild size="lg">
                  <Link href="/auth/login">Logg inn</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link href={signedIn ? '/laererveiledning' : '/om'}>
                  {signedIn ? 'Lærerveiledning' : 'Om verktøyene'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
