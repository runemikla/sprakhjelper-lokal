import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { OmPage } from '@/components/om/om-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownUp, BookOpen, Headphones, PenLine, Settings, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Om verktøyene - Språkhjelp',
}

const tools = [
  {
    href: '/spraakhjelper',
    title: 'Skrivehjelp',
    image: '/images/verktoy/skrivehjelp.webp',
    imageAlt: 'En elev skriver på en bærbar PC ved et skrivebord.',
    icon: PenLine,
    who: 'For elever. Krever ikke innlogging.',
    description:
      'Eleven skriver eller limer inn en tekst på inntil 1000 tegn og velger morsmål. KI-en deler teksten opp i setninger og gir forklaringer og forslag på bokmål og på morsmålet, uten å bare rette teksten for eleven. Eleven prøver selv å skrive setningen riktig.',
    credit:
      'Skrivehjelp bygger på en systeminstruks opprinnelig utformet av Ine Jørvum og Jan Erik Paulsen, og har siden blitt videreutviklet i tett samarbeid med andrespråkspedagoger i fylkeskommunen.',
    points: [
      'Tilbakemelding setning for setning',
      'Forklaring på norsk og morsmål',
      'Sammendrag med analyse som kan deles med læreren',
    ],
  },
  {
    href: '/grammatikk',
    title: 'Grammatikkøving',
    image: '/images/verktoy/grammatikk.webp',
    imageAlt: 'Hender på et nettbrett drar et ord på plass i en setning.',
    icon: ArrowDownUp,
    who: 'For elever. Krever ikke innlogging.',
    description:
      'Korte, interaktive oppgaver i norsk grammatikk. Ordrekkefølge er tilgjengelig nå: eleven drar ordene i riktig rekkefølge, og KI-en lager nye setninger på flere nivåer. Flere temaer kommer.',
    points: [
      'Dra og slipp ord til riktig rekkefølge',
      'Flere nivåer å øve på',
      'Oversikt over det eleven har øvd på (lagres bare i nettleseren)',
    ],
  },
  {
    href: '/lytteoving',
    title: 'Lytteøving',
    image: '/images/verktoy/lytteoving.webp',
    imageAlt: 'En elev med hodetelefoner svarer på sant/usant-oppgaver på et nettbrett.',
    icon: Headphones,
    who: 'Læreren lager øvingen (innlogget). Elevene åpner den med en kode.',
    description:
      'Læreren skriver eller limer inn en tekst, velger stemme og hastighet, og får lyd og spørsmål laget automatisk. En øving kan ha inntil tre oppgaver. Elevene hører lyden, svarer på åpne spørsmål eller påstander (sant/usant) og får tilbakemelding ut fra innholdet i teksten.',
    points: [
      'Inntil tre oppgaver med egen lyd og egne spørsmål',
      'Åpne spørsmål eller påstander',
      'Elever åpner øvingen med en kort kode, uten å logge inn',
    ],
  },
  {
    href: '/laer-ord',
    title: 'Lær ord',
    image: '/images/verktoy/laer-ord.webp',
    imageAlt: 'Hender holder et nettbrett med et bildekort av et eple.',
    icon: BookOpen,
    who: 'Krever innlogging. Lærere lager ordlister, elever øver.',
    description:
      'Elevene øver på ordlister som læreren har delt med gruppen deres. Læreren skriver inn inntil 20 ord og velger språk, stemme og kontekst for bildene. Bøyning, oversettelse, eksempelsetning, lyd og bilde lages automatisk.',
    points: [
      'Øvelser: ordliste, velg riktig ord, lytt og velg, hør og skriv, match ord og setning, flashcards',
      'Lyd og bilde til hvert ord',
      'Ordlister deles med grupper',
    ],
  },
  {
    href: '/grupper',
    title: 'Grupper',
    icon: Users,
    who: 'Krever innlogging.',
    description:
      'Læreren lager en gruppe for klassen og får en tilgangskode på seks tegn. Elevene skriver inn koden for å bli med. Ordlister i Lær ord deles med en eller flere grupper.',
    points: [
      'Læreren ser hvem som er med, og kan fjerne medlemmer',
      'Elevene ser ordlistene som er delt med gruppene deres',
    ],
  },
]

export default function OmVerktoyenePage() {
  return (
    <OmPage
      current="/om"
      title="Om verktøyene"
      intro={
        <p>
          Språkhjelp er en prototype utviklet av Rune Mikal Birkeland, som del av et større prosjekt
          i Vestland fylkeskommune. Målet er å utvikle KI-verktøy som kan støtte språklæringen til
          elever med norsk som andrespråk.
        </p>
      }
    >
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
                <p className="text-sm text-gray-500">{tool.who}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {'image' in tool && tool.image ? (
                  <Image
                    src={tool.image}
                    alt={tool.imageAlt ?? ''}
                    width={800}
                    height={597}
                    sizes="(min-width: 768px) 320px, 100vw"
                    className="w-full md:float-right md:ml-6 md:mb-2 md:w-80 rounded-lg"
                  />
                ) : null}
                <p className="text-gray-700 leading-relaxed">{tool.description}</p>
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
                  className="clear-both inline-flex font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800"
                >
                  Åpne {tool.title.toLowerCase()}
                </Link>
              </CardContent>
            </Card>
          )
        })}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-[#9ADBE8]" />
              For administratorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-700 leading-relaxed">
            <p>
              Administratorer har to ekstra sider i menyen KI-verktøy. På <strong>Instrukser</strong>{' '}
              kan de lese og endre instruksene KI-en får i hvert verktøy, med versjoner som kan
              rulles tilbake. På <strong>Språkmodell</strong> velger de hvilken språkmodell
              verktøyene bruker.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">Teknologien bak</h2>
      <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed mb-12">
        <li>Tilbakemeldinger, spørsmål og ordinnhold lages med språkmodeller i Microsoft Azure OpenAI.</li>
        <li>Lyd lages med Google Cloud tekst til tale og Google Gemini. Bildene i Lær ord lages med Google Gemini.</li>
        <li>Innlogging, grupper, ordlister og lytteøvinger lagres i Supabase.</li>
        <li>
          Nettsiden driftes hos Hetzner i EU. Les mer under{' '}
          <Link href="/personvern" className="text-blue-700 underline underline-offset-4">
            Personvern og GDPR
          </Link>
          .
        </li>
      </ul>

      <div className="flex justify-center">
        <Image
          src="/images/vestland_team.jpg"
          alt="Teamet bak Språkhjelp"
          width={600}
          height={400}
          className="object-contain rounded-lg shadow-md"
        />
      </div>
    </OmPage>
  )
}
