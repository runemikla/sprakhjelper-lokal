import Link from 'next/link'
import Image from 'next/image'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowDownUp,
  Headphones,
  PenLine,
  ShieldCheck,
} from 'lucide-react'

const tools = [
  {
    href: '/spraakhjelper',
    title: 'Skrivehjelp',
    icon: PenLine,
    description:
      'Lim inn eller skriv en tekst. KI-en gir forklaringer og forslag på bokmål og på elevens morsmål, uten å bare rette teksten for eleven.',
    credit:
      'Den bygger på en systeminstruks opprinnelig utformet av Ine Jørvum og Jan Erik Paulsen, og har siden blitt videreutviklet i tett samarbeid med andrespråkspedagoger i fylkeskommunen.',
    points: [
      'Tilbakemelding setning for setning',
      'Forklaring på norsk og morsmål',
      'Rapport du kan dele med læreren',
    ],
  },
  {
    href: '/grammatikk',
    title: 'Grammatikkøving',
    icon: ArrowDownUp,
    description:
      'Øv på norsk grammatikk med korte, interaktive oppgaver. Ordrekkefølge er tilgjengelig nå. Flere temaer kommer.',
    points: [
      'Dra og slipp ord til riktig rekkefølge',
      'Flere nivåer å øve på',
      'Oversikt over det du har øvd på',
    ],
  },
  {
    href: '/lytteoving',
    title: 'Lytteøving',
    icon: Headphones,
    description:
      'Læreren lager en lytteøving med inntil tre oppgaver. Elevene hører lyden, svarer på spørsmål og får tilbakemelding ut fra innholdet i teksten.',
    points: [
      'Inntil tre oppgaver med egen lyd og spørsmål',
      'Lærer lager øving og får en kort kode',
      'Elever åpner øvingen uten å logge inn',
    ],
  },
]

export default function OmPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Om Språkhjelp
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Språkhjelp er en prototype utviklet av Rune Mikal Birkeland, som del av et større prosjekt i Vestland fylkeskommune. Målet er å utvikle KI-verktøy som kan støtte språklæringen til elever med norsk som andrespråk.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Verktøyene
          </h2>
          <div className="grid grid-cols-1 gap-6 mb-12">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Card key={tool.href}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-6 w-6 text-[#9ADBE8]" />
                      {tool.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      {tool.description}
                    </p>
                    {'credit' in tool && tool.credit ? (
                      <p className="text-gray-700 leading-relaxed">{tool.credit}</p>
                    ) : null}
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      {tool.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <Link
                      href={tool.href}
                      className="inline-flex font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800"
                    >
                      Åpne {tool.title.toLowerCase()}
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#9ADBE8]" />
                GDPR og personvern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                Vestland fylkeskommune er behandlingsansvarlig. Tjenesten er laget
                for opplæring og samler inn så lite som mulig data. Data behandles
                i EU, med unntak av tekst til tale i lytteøving (se under). Dette er generiske tekster som ikke inneholder personlig informasjon.
              </p>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Du trenger ikke logge inn for å øve
                </h3>
                <p>
                  Tilgang til appen styres med en skolekode, ikke med navn eller
                  fødselsnummer. Innlogging med e-post er valgfritt og brukes av
                  lærere som skal lagre lytteøvinger.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Hva skjer med det du skriver og svarer?
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Skrivehjelp:</strong> Teksten sendes til en
                    KI-tjeneste for å lage tilbakemelding. Resultatet lagres
                    bare i nettleseren din i økten, og forsvinner når du lukker
                    den.
                  </li>
                  <li>
                    <strong>Grammatikkøving:</strong> Øvingen skjer i
                    nettleseren. Vi lagrer ikke en elevprofil eller
                    øvingsresultater hos oss.
                  </li>
                  <li>
                    <strong>Lytteøving:</strong> Læreren lagrer tekst, lyd og
                    spørsmål for inntil tre oppgaver. Elever åpner øvingen med
                    en kort kode, uten konto. Svarene sjekkes av KI mot
                    originalteksten og lagres ikke som en elevbesvarelse hos oss.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Hvem behandler data på våre vegne?
                </h3>
                <p>
                  For å levere tjenesten bruker vi databehandlere. De fleste
                  behandler data i EU.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Microsoft Azure OpenAI — språkanalyse og tilbakemelding (EU)</li>
                  <li>Supabase — innlogging og lagring av lærerens lytteøvinger (EU)</li>
                  <li>Hetzner — drift av nettsiden (EU)</li>
                  <li>ElevenLabs — tekst til tale for lytteøvinger (USA)</li>
                </ul>
                <p className="mt-4">
                  ElevenLabs behandler data utenfor EU når lærerens tekst gjøres
                  om til tale. Det gjelder bare tekster som skal brukes i
                  lytteøving, og det er bare lærere som kan opprette lytteøvinger.
                  ElevenLabs er valgt fordi de har naturlige stemmer som egner
                  seg til denne typen øving. Det arbeides med alternativer innenfor EU.
                </p>
                <p className="mt-2">
                  All trafikk til appen går over HTTPS. Vi bruker bare nødvendige
                  informasjonskapsler til tilgang og innlogging, ikke til sporing
                  eller markedsføring.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Image
              src="/images/vestland_team.jpg"
              alt="Teamet bak Språkhjelp"
              width={600}
              height={400}
              className="object-contain rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
