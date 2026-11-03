import type { Metadata } from 'next'
import Link from 'next/link'
import { OmPage } from '@/components/om/om-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Lærerveiledning - Språkhjelp',
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-700 leading-relaxed">{children}</CardContent>
    </Card>
  )
}

const linkClass = 'text-blue-700 underline underline-offset-4 hover:text-blue-800'

export default function LaererveiledningPage() {
  return (
    <OmPage
      current="/laererveiledning"
      title="Lærerveiledning"
      intro={
        <p>
          Slik kommer du i gang med Språkhjelp i klassen. Verktøyene er laget for elever med norsk
          som andrespråk, og skal støtte læringen, ikke gjøre jobben for eleven.
        </p>
      }
    >
      <div className="space-y-6">
        <Step title="1. Tilgang og innlogging">
          <p>
            Alle trenger skolekoden for å åpne appen. Skrivehjelp, Grammatikkøving og elevdelen av
            Lytteøving fungerer uten konto.
          </p>
          <p>
            For å lage lytteøvinger, ordlister og grupper må du{' '}
            <Link href="/auth/login" className={linkClass}>
              logge inn
            </Link>{' '}
            med en lærerkonto. Nye kontoer blir elevkontoer. Ta kontakt med administrator for å få
            lærerrolle.
          </p>
        </Step>

        <Step title="2. Skrivehjelp">
          <p>
            Eleven skriver eller limer inn en tekst (inntil 1000 tegn) og velger morsmål.
            Skrivehjelp går gjennom teksten setning for setning og forklarer hva som kan bli
            bedre, på norsk og på morsmålet. Eleven skriver selv setningen på nytt og får sjekket
            den.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be eleven lese forklaringen før de prøver igjen, ikke bare gjette.</li>
            <li>
              Til slutt kan eleven lage et sammendrag med analyse av teksten. Det kan lastes ned og
              deles med deg.
            </li>
            <li>Resultatet forsvinner når fanen lukkes. Be eleven laste ned sammendraget først.</li>
          </ul>
        </Step>

        <Step title="3. Grammatikkøving">
          <p>
            I Ordrekkefølge drar eleven ordene i riktig rekkefølge. Oppgavene har flere nivåer, og
            eleven går videre når de mestrer et nivå. Eleven kan se en oversikt over det de har
            øvd på. Oversikten lagres bare i elevens nettleser.
          </p>
        </Step>

        <Step title="4. Lytteøving">
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Gå til{' '}
              <Link href="/lytteoving" className={linkClass}>
                Lytteøving
              </Link>{' '}
              og trykk «Lag ny».
            </li>
            <li>Skriv eller lim inn teksten. Velg stemme og hastighet.</li>
            <li>
              Velg om det skal være åpne spørsmål eller påstander (sant/usant), og hvor mange.
              Lyd og spørsmål lages automatisk. Les gjennom og juster før du lagrer.
            </li>
            <li>Legg til inntil tre oppgaver i samme øving.</li>
            <li>Lagre. Du får en kort kode som elevene skriver inn for å åpne øvingen.</li>
          </ol>
          <p>Elevene trenger ikke konto. Svarene sjekkes mot teksten og lagres ikke.</p>
        </Step>

        <Step title="5. Grupper">
          <p>
            Lag en gruppe for klassen under{' '}
            <Link href="/grupper" className={linkClass}>
              Grupper
            </Link>
            . Gruppen får en tilgangskode på seks tegn. Elevene logger inn, velger «Ny gruppe» og
            skriver inn koden. Du ser hvem som er med, og kan fjerne medlemmer.
          </p>
        </Step>

        <Step title="6. Lær ord og ordlister">
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Gå til{' '}
              <Link href="/laer-ord" className={linkClass}>
                Lær ord
              </Link>{' '}
              og trykk «Lag ny».
            </li>
            <li>
              Skriv inn inntil 20 ord, velg språk for oversettelse og stemme. Skriv gjerne en kort
              kontekst for bildene, for eksempel «på kjøkkenet», så bildene passer sammen. Konteksten
              kan ikke endres etterpå.
            </li>
            <li>Velg hvilke grupper som skal få listen, og lagre.</li>
            <li>
              Bøyning, oversettelse, eksempelsetning, lyd og bilde lages automatisk. Se over
              innholdet og rett det som ikke stemmer. Bilder kan lages på nytt for enkeltord.
            </li>
          </ol>
          <p>
            Elevene i gruppen finner listen i Lær ord og kan øve med ordliste, «Velg riktig ord»,
            «Lytt og velg», «Hør og skriv», «Match ord og setning» og flashcards.
          </p>
        </Step>

        <Step title="Gode råd">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              KI kan ta feil. Se over spørsmål, oversettelser og bilder før elevene bruker dem.
            </li>
            <li>Be elevene ikke skrive navn eller andre personopplysninger i tekstene.</li>
            <li>
              Les mer om hvordan data behandles under{' '}
              <Link href="/personvern" className={linkClass}>
                Personvern og GDPR
              </Link>
              , og se hva som er nytt i{' '}
              <Link href="/endringslogg" className={linkClass}>
                Endringsloggen
              </Link>
              .
            </li>
          </ul>
        </Step>
      </div>
    </OmPage>
  )
}
