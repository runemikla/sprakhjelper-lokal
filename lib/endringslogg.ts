// Endringsloggen som vises på /endringslogg.
//
// Slik legger du til en ny endring:
// 1. Legg en ny oppføring ØVERST i listen (nyeste først).
// 2. Bruk datoen endringen kom ut, på formen 'ÅÅÅÅ-MM-DD'.
// 3. Skriv kort og brukervennlig: hva kan læreren eller eleven gjøre nå?
//    Ikke bruk tekniske PR-titler.
// 4. Hører flere endringer til samme dag, legg dem som flere punkter i samme oppføring.
//
// Se også docs/ENDRINGSLOGG.md.

export type Endringstype = 'nytt' | 'forbedret' | 'rettet'

export interface Endring {
  type: Endringstype
  tekst: string
}

export interface Endringsoppforing {
  dato: string
  tittel?: string
  endringer: Endring[]
}

export const ENDRINGSLOGG: Endringsoppforing[] = [
  {
    dato: '2026-11-09',
    endringer: [
      { type: 'forbedret', tekst: 'Siden «Om verktøyene» har fått illustrasjoner av Skrivehjelp, Grammatikkøving, Lytteøving og Lær ord.' },
    ],
  },
  {
    dato: '2026-11-03',
    tittel: 'Om Språkhjelp og bedre ordlister',
    endringer: [
      { type: 'nytt', tekst: 'Ny side «Om Språkhjelp» med lærerveiledning, om verktøyene, læreplaner (kompetansemål for modul 1–4 og nivå A1–B2), personvern og GDPR, og denne endringsloggen.' },
      { type: 'nytt', tekst: 'Ordlister: arabisk (syrisk dialekt) er lagt til som språk.' },
      { type: 'nytt', tekst: 'Ordlister: feltet «Kontekst for bildene» gjør at alle bildene i en liste passer til samme tema. Konteksten velges når listen lages.' },
      { type: 'forbedret', tekst: 'Ordlister og lytteøving: velg mellom fire stemmer (Enceladus, Iapetus, Erinome og Callirrhoe), og hør stemmen før du velger.' },
      { type: 'forbedret', tekst: 'Ordlister: en liste kan ha inntil 20 ord.' },
      { type: 'forbedret', tekst: 'Færre forstyrrelser: beskjedene som spratt opp nederst på skjermen (for eksempel «Analyse fullført!» og «PDF lastet ned!») er fjernet. Feilmeldinger vises fortsatt.' },
    ],
  },
  {
    dato: '2026-11-02',
    tittel: 'Lær ord, ordlister og grupper',
    endringer: [
      { type: 'nytt', tekst: 'Nytt verktøy: Lær ord. Elevene øver på ord med ordliste, «Velg riktig ord», «Lytt og velg», «Hør og skriv», «Match ord og setning» og flashcards.' },
      { type: 'nytt', tekst: 'Lærere kan lage egne ordlister. Bøyning, oversettelse, eksempelsetning, lyd og bilde lages automatisk når listen lagres.' },
      { type: 'nytt', tekst: 'Grupper: lærere lager en gruppe for klassen og gir elevene en tilgangskode. Ordlister deles med gruppene.' },
      { type: 'forbedret', tekst: 'Ordlister er flyttet inn i Lær ord, og de faste temaene er gjort om til vanlige ordlister.' },
      { type: 'forbedret', tekst: 'Lær ord: større bilder på flashcards, og hele ordlisteboksen kan klikkes og viser et lite bilde.' },
      { type: 'forbedret', tekst: 'Skrivehjelp: setningsfeltet har plass til flere linjer, og visningen er mer kompakt på mobil.' },
      { type: 'rettet', tekst: 'iPhone zoomer ikke lenger inn når du trykker i et tekstfelt.' },
      { type: 'rettet', tekst: 'Lyden i ordlistene spilles nå med riktig stemme, ikke nettleserens egen stemme.' },
    ],
  },
  {
    dato: '2026-10-30',
    endringer: [
      { type: 'forbedret', tekst: 'Skrivehjelp: fanfaren som spilte ved riktig setning er fjernet.' },
      { type: 'rettet', tekst: 'Lytteøving: opplesingen er mer stabil.' },
    ],
  },
  {
    dato: '2026-10-28',
    endringer: [
      { type: 'forbedret', tekst: 'Lytteøving: ny og mer naturlig norsk stemme, og mulighet for saktere opplesing.' },
      { type: 'nytt', tekst: 'Admin: språkmodellen bak KI-verktøyene kan byttes fra admin-siden.' },
    ],
  },
  {
    dato: '2026-10-27',
    endringer: [
      { type: 'nytt', tekst: 'Admin: instruksene til KI-en kan leses, endres og rulles tilbake til tidligere versjoner.' },
    ],
  },
  {
    dato: '2026-09-10',
    endringer: [
      { type: 'nytt', tekst: 'Lytteøving: læreren kan velge påstander (sant eller usant) i stedet for åpne spørsmål.' },
    ],
  },
  {
    dato: '2026-09-09',
    endringer: [
      { type: 'nytt', tekst: 'Lytteøving: en øving kan ha inntil tre oppgaver, hver med egen lyd og egne spørsmål.' },
    ],
  },
  {
    dato: '2026-09-08',
    endringer: [{ type: 'forbedret', tekst: 'Flere morsmål å velge mellom.' }],
  },
  {
    dato: '2026-08-24',
    tittel: 'Lytteøving',
    endringer: [
      { type: 'nytt', tekst: 'Nytt verktøy: Lytteøving. Læreren lager en øving og får en kort kode. Elevene hører teksten, svarer på spørsmål og får tilbakemelding.' },
      { type: 'forbedret', tekst: 'Ny og bedre språkmodell gir mer presise tilbakemeldinger.' },
    ],
  },
  {
    dato: '2026-06-15',
    tittel: 'Grammatikkøving',
    endringer: [
      { type: 'nytt', tekst: 'Nytt verktøy: Grammatikkøving med ordrekkefølge. Dra ordene i riktig rekkefølge på flere nivåer.' },
      { type: 'forbedret', tekst: 'Setningene i ordrekkefølge varierer mer, så eleven får færre gjentakelser.' },
    ],
  },
  {
    dato: '2026-04-14',
    endringer: [
      { type: 'nytt', tekst: 'Tilgang til appen med skolekode.' },
      { type: 'forbedret', tekst: 'Skrivehjelp: grense på 1000 tegn per tekst.' },
      { type: 'forbedret', tekst: 'Nye bilder og oppdatert informasjon om prosjektet.' },
    ],
  },
  {
    dato: '2026-01-15',
    endringer: [{ type: 'forbedret', tekst: 'Skrivehjelp kan brukes uten å logge inn.' }],
  },
  {
    dato: '2026-01-13',
    endringer: [{ type: 'forbedret', tekst: 'Sikkerhetsgjennomgang av appen.' }],
  },
  {
    dato: '2026-01-07',
    endringer: [
      { type: 'forbedret', tekst: 'Skrivehjelp: bedre instruks til KI-en og flere språk.' },
      { type: 'forbedret', tekst: 'Justert design.' },
    ],
  },
  {
    dato: '2025-11-25',
    endringer: [
      { type: 'forbedret', tekst: 'Ny personvernerklæring, kontaktinformasjon og Om-side.' },
    ],
  },
  {
    dato: '2025-11-24',
    endringer: [
      { type: 'nytt', tekst: 'Ny forside.' },
      { type: 'forbedret', tekst: 'Skrivehjelp: bedre tilbakemeldinger og retting.' },
    ],
  },
  {
    dato: '2025-11-21',
    endringer: [
      { type: 'nytt', tekst: 'Skrivehjelp: sammendrag med analyse av teksten og bilder til tilbakemeldingene.' },
    ],
  },
  {
    dato: '2025-11-12',
    endringer: [{ type: 'forbedret', tekst: 'Skrivehjelp: bedre instruks til KI-en og små designendringer.' }],
  },
  {
    dato: '2025-11-03',
    endringer: [
      { type: 'nytt', tekst: 'Skrivehjelp deler teksten opp i setninger og gir tilbakemelding på hver setning.' },
    ],
  },
  {
    dato: '2025-11-01',
    tittel: 'Første versjon',
    endringer: [{ type: 'nytt', tekst: 'Første versjon av Språkhjelp med Skrivehjelp.' }],
  },
]
