import type { Metadata } from 'next'
import { OmPage } from '@/components/om/om-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Personvern og GDPR - Språkhjelp',
}

// Dato for siste faglige gjennomgang av teksten. Oppdater når teksten endres.
const SIST_OPPDATERT = '3. november 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-gray-700 leading-relaxed">{children}</CardContent>
    </Card>
  )
}

export default function PersonvernPage() {
  return (
    <OmPage
      current="/personvern"
      title="Personvern og GDPR"
      intro={
        <p>
          Her forklarer vi hvilke opplysninger Språkhjelp lagrer, hvilke tjenester som behandler
          dem, og hvilke rettigheter du har. Tjenesten er laget for opplæring og samler inn så lite
          som mulig.
        </p>
      }
    >
      <div
        role="note"
        className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          <strong>Utkast.</strong> Denne teksten beskriver hvordan appen fungerer teknisk. Den er
          ikke juridisk kvalitetssikret og må gjennomgås av behandlingsansvarlig (og gjerne
          personvernombudet) før den regnes som gjeldende personvernerklæring.
        </p>
      </div>

      <div className="space-y-6">
        <Section title="Behandlingsansvarlig">
          <p>
            <strong>Vestland fylkeskommune</strong> er behandlingsansvarlig for Språkhjelp.
          </p>
          <p>
            Organisasjonsnummer 974 574 861 · Postboks 7900, 5020 Bergen ·{' '}
            <a href="mailto:post@vlfk.no" className="text-blue-700 underline underline-offset-4">
              post@vlfk.no
            </a>
          </p>
          <p>
            Spørsmål om selve tjenesten kan sendes til{' '}
            <a
              href="mailto:rune.mikal.birkeland@vlfk.no"
              className="text-blue-700 underline underline-offset-4"
            >
              rune.mikal.birkeland@vlfk.no
            </a>
            .
          </p>
        </Section>

        <Section title="Bruk uten innlogging">
          <p>
            Tilgang til appen styres med en skolekode. Koden lagres i en informasjonskapsel i
            nettleseren, og den knyttes ikke til navn eller fødselsnummer.
          </p>
          <p>
            Skrivehjelp, Grammatikkøving og elevdelen av Lytteøving kan brukes uten å logge inn.
            Da lagrer vi ingen opplysninger om eleven hos oss.
          </p>
        </Section>

        <Section title="Hva lagres når du logger inn?">
          <p>
            Lærere trenger konto for å lage lytteøvinger, ordlister og grupper. Elever trenger konto
            for å bli med i en gruppe og bruke Lær ord. Følgende lagres i databasen (Supabase):
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Konto:</strong> e-postadresse, passord (lagret kryptert), rolle (elev, lærer
              eller administrator) og tidspunkt for opprettelse og innlogging.
            </li>
            <li>
              <strong>Grupper:</strong> gruppenavn, tilgangskode, hvem som laget gruppen, og hvilke
              brukere som er medlemmer og når de ble med. Læreren som eier gruppen, ser e-postadressen
              til medlemmene.
            </li>
            <li>
              <strong>Ordlister:</strong> tittel, ord, språk, bildekontekst og innholdet som lages
              automatisk (bøyning, oversettelse, eksempelsetning, lyd og bilde), og hvilke grupper
              listen er delt med.
            </li>
            <li>
              <strong>Lytteøvinger:</strong> lærerens tekst, lyd, spørsmål og en kort kode.
            </li>
          </ul>
          <p>
            Elevens svar i Lytteøving og Lær ord lagres ikke hos oss. Framgang i Grammatikkøving og
            Lær ord lagres bare i elevens egen nettleser.
          </p>
        </Section>

        <Section title="Hva skjer med teksten du skriver?">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Skrivehjelp:</strong> Teksten og valgt morsmål sendes til en språkmodell for å
              lage tilbakemelding. Resultatet lagres bare i nettleseren mens økten varer, og
              forsvinner når fanen lukkes.
            </li>
            <li>
              <strong>Grammatikkøving:</strong> Setningene lages av en språkmodell. Elevens svar
              sjekkes i nettleseren eller av språkmodellen og lagres ikke.
            </li>
            <li>
              <strong>Lytteøving:</strong> Lærerens tekst sendes til en språkmodell for å lage
              spørsmål, og til tekst til tale for å lage lyd. Elevens svar sendes til språkmodellen
              for å få tilbakemelding, men lagres ikke.
            </li>
            <li>
              <strong>Lær ord:</strong> Ordene i lærerens ordliste sendes til en språkmodell for å
              lage innhold, til tekst til tale for lyd og til en bildemodell for bilder.
            </li>
          </ul>
          <p>
            Ikke skriv navn, fødselsnummer eller andre personopplysninger i tekstene. Verktøyene
            trenger ikke slike opplysninger.
          </p>
        </Section>

        <Section title="Hvem behandler data på våre vegne?">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Microsoft Azure OpenAI</strong>: språkmodellen bak tilbakemeldinger, spørsmål
              og ordinnhold.
            </li>
            <li>
              <strong>Google Cloud tekst til tale og Google Gemini</strong>: lyd i lytteøvinger og
              ordlister, og bilder i Lær ord. Dette gjelder bare tekst og ord som læreren har lagt
              inn. Google kan behandle data utenfor EU.
            </li>
            <li>
              <strong>Supabase</strong>: innlogging og lagring av grupper, ordlister og
              lytteøvinger.
            </li>
            <li>
              <strong>Hetzner</strong>: drift av nettsiden, i EU.
            </li>
          </ul>
        </Section>

        <Section title="Sikkerhet og informasjonskapsler">
          <ul className="list-disc pl-5 space-y-2">
            <li>All trafikk til appen går over HTTPS.</li>
            <li>
              Tilgangen til data i databasen er begrenset per bruker, slik at du bare ser dine egne
              grupper og ordlister og dem som er delt med deg.
            </li>
            <li>
              Antall forespørsler per IP-adresse begrenses for å hindre misbruk. IP-adressen holdes
              bare i minnet på serveren en kort stund og lagres ikke i databasen.
            </li>
            <li>
              Vi bruker bare nødvendige informasjonskapsler for tilgangskode og innlogging, ikke til
              sporing eller markedsføring.
            </li>
          </ul>
        </Section>

        <Section title="Dine rettigheter">
          <p>
            Du har rett til innsyn i, retting av og sletting av opplysninger om deg, og rett til å
            protestere mot behandlingen. Ta kontakt på{' '}
            <a href="mailto:post@vlfk.no" className="text-blue-700 underline underline-offset-4">
              post@vlfk.no
            </a>{' '}
            hvis du vil bruke rettighetene dine eller slette kontoen din.
          </p>
          <p>
            Mener du at vi ikke behandler opplysningene dine riktig, kan du klage til{' '}
            <a
              href="https://www.datatilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline underline-offset-4"
            >
              Datatilsynet
            </a>
            .
          </p>
        </Section>

        <p className="text-sm text-gray-500">Sist oppdatert: {SIST_OPPDATERT}</p>
      </div>
    </OmPage>
  )
}
