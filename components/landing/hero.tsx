import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FjordBackground, MobilePhotoCredit } from '@/components/landing/fjord-background'
import { PageHeader } from '@/components/landing/page-header'
import { VerktoyKort } from '@/components/landing/verktoy-kort'

// Front page for everyone who is not a signed-in student: the shared page
// header, the four tools as picture cards, and a way to sign in.
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative">
      <FjordBackground mobileCredit={false} />

      <div className="relative z-10 container mx-auto max-w-4xl px-2 pt-24 pb-12 sm:px-4">
        <PageHeader
          title="Språkhjelp"
          description="Skriv tekster, lytt, lær nye ord og øv på grammatikk. Du får forklaringer på norsk og på ditt eget morsmål."
        />
        <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
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

        <MobilePhotoCredit />
      </div>
    </section>
  )
}
