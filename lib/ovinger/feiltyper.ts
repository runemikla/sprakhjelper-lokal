// Feiltypene som Skrivehjelp kan lage øvinger til, fra dokumentet
// «Feiltyper i elevtekster og øvinger (A1–B2)», versjon 1.2 (kap. 2).
//
// Første versjon har bare to øvingsformater (dok. kap. 1.4):
// - 'bygg_setning': bygg setningen med ord fra en ordbank (setningsbygning)
// - 'velg_ord': fyll inn riktig ord, velg blant 2–4 alternativer (ordnivå)
//
// Tegnsetting og feil som gjelder hele teksten er utsatt (dok. kap. 7) og er
// derfor ikke med her.

export type Nivaa = 'A1' | 'A2' | 'B1' | 'B2'

export const NIVAAER: Nivaa[] = ['A1', 'A2', 'B1', 'B2']

export type Ovingsformat = 'bygg_setning' | 'velg_ord'

export interface Feiltype {
  kode: string
  navn: string
  eksempel: string
  forventet: string
  global: 'ja' | 'nei' | 'sjelden'
  // Formatene som passer feiltypen. Det første er standard.
  formater: Ovingsformat[]
}

const ORD: Ovingsformat[] = ['velg_ord']
const SETNING: Ovingsformat[] = ['bygg_setning']
const BEGGE: Ovingsformat[] = ['bygg_setning', 'velg_ord']

export const FEILTYPER: Feiltype[] = [
  { kode: 'R1', navn: 'Lydnær stavemåte', eksempel: 'komer → kommer', forventet: 'A2 (vanlige ord), B1', global: 'sjelden', formater: ORD },
  { kode: 'R2', navn: 'Stumme og spesielle bokstaver', eksempel: 'vem, jore → hvem, gjøre', forventet: 'A2', global: 'sjelden', formater: ORD },
  { kode: 'R3', navn: 'Særskriving og sammenskriving', eksempel: 'buss stopp → busstopp', forventet: 'B1', global: 'sjelden', formater: ORD },
  { kode: 'R4', navn: 'Stor og liten bokstav', eksempel: 'norge, Mandag → Norge, mandag', forventet: 'A2', global: 'nei', formater: ORD },
  { kode: 'R5', navn: 'Ord som høres like ut (og/å, ditt/dit)', eksempel: 'Jeg liker og lese → å lese', forventet: 'A2', global: 'sjelden', formater: ORD },
  { kode: 'S1', navn: 'Kjønn og ubestemt artikkel', eksempel: 'et bil → en bil', forventet: 'A2', global: 'nei', formater: ORD },
  { kode: 'S2', navn: 'Bestemt eller ubestemt form', eksempel: 'Jeg har bil. Bil er rød. → Bilen er rød.', forventet: 'B1', global: 'sjelden', formater: ORD },
  { kode: 'S3', navn: 'Bøyning av substantiv', eksempel: 'to barner → to barn', forventet: 'A2 (vanlige), B1', global: 'nei', formater: ORD },
  { kode: 'S4', navn: 'Dobbel bestemthet', eksempel: 'den store hus → det store huset', forventet: 'B1', global: 'nei', formater: ORD },
  { kode: 'S5', navn: 'Eieform (genitiv)', eksempel: 'huset av Ali → Alis hus', forventet: 'B1', global: 'nei', formater: ORD },
  { kode: 'P1', navn: 'Subjektsform eller objektsform', eksempel: 'Hun ser jeg → Hun ser meg', forventet: 'A2', global: 'sjelden', formater: ORD },
  { kode: 'P2', navn: 'Refleksiv (seg, sin/si/sitt/sine)', eksempel: 'Hun ringer hennes mor → moren sin', forventet: 'B1', global: 'ja', formater: ORD },
  { kode: 'P3', navn: 'Pronomen som viser tilbake (den/det)', eksempel: 'en jakke. Det er blå. → Den er blå.', forventet: 'A2–B1', global: 'ja', formater: ORD },
  { kode: 'P4', navn: 'Mangler formelt subjekt «det»', eksempel: 'Er kaldt i dag. → Det er kaldt i dag.', forventet: 'A2', global: 'sjelden', formater: BEGGE },
  { kode: 'P5', navn: 'Bøyning av eiendomsord', eksempel: 'min hus → mitt hus / huset mitt', forventet: 'A2', global: 'nei', formater: ORD },
  { kode: 'A1', navn: 'Samsvarsbøyning av adjektiv', eksempel: 'et fin hus → et fint hus', forventet: 'A2', global: 'nei', formater: ORD },
  { kode: 'A2', navn: 'Gradbøying', eksempel: 'mer stor → større', forventet: 'A2–B1', global: 'nei', formater: ORD },
  { kode: 'A3', navn: 'Adjektiv eller adverb', eksempel: 'Han snakker norsk god → godt', forventet: 'B1', global: 'nei', formater: ORD },
  { kode: 'V1', navn: 'Presens: manglende eller ekstra -r', eksempel: 'Jeg spise, kan snakker → spiser, kan snakke', forventet: 'A1', global: 'sjelden', formater: ORD },
  { kode: 'V2', navn: 'Infinitiv og «å»', eksempel: 'Jeg må å jobbe → må jobbe', forventet: 'A2', global: 'nei', formater: BEGGE },
  { kode: 'V3', navn: 'Bøyning i fortid', eksempel: 'gådde → gikk', forventet: 'A2 (vanlige), B1', global: 'sjelden', formater: ORD },
  { kode: 'V4', navn: 'Valg av tid', eksempel: 'Jeg har vært i Bergen i fjor → Jeg var', forventet: 'A2–B1', global: 'ja', formater: ORD },
  { kode: 'V5', navn: 'Tidsforhold i fortid (hadde + partisipp)', eksempel: 'Da jeg kom, gikk bussen → hadde gått', forventet: 'B1', global: 'ja', formater: ORD },
  { kode: 'V6', navn: 'Framtid', eksempel: 'Jeg kommer jobbe i morgen → skal jobbe', forventet: 'A2', global: 'sjelden', formater: ORD },
  { kode: 'V7', navn: 'Passiv', eksempel: 'Brevet ble sende → ble sendt', forventet: 'B1 (bli), B2 (s-passiv)', global: 'sjelden', formater: ORD },
  { kode: 'V8', navn: 'Partikkelverb og refleksive verb', eksempel: 'Jeg gleder på ferien → gleder meg til', forventet: 'B1', global: 'ja', formater: ORD },
  { kode: 'O1', navn: 'Verbet på andre plass (inversjon)', eksempel: 'I går jeg gikk → I går gikk jeg', forventet: 'A2', global: 'sjelden', formater: SETNING },
  { kode: 'O2', navn: 'Spørsmål', eksempel: 'Hvor du bor? → Hvor bor du?', forventet: 'A1', global: 'sjelden', formater: SETNING },
  { kode: 'O3', navn: '«Ikke» og setningsadverb i hovedsetning', eksempel: 'Jeg ikke liker fisk → Jeg liker ikke fisk', forventet: 'A1–A2', global: 'sjelden', formater: SETNING },
  { kode: 'O4', navn: 'Ordstilling i leddsetning', eksempel: 'fordi jeg har ikke tid → fordi jeg ikke har tid', forventet: 'B1', global: 'nei', formater: SETNING },
  { kode: 'O5', navn: 'Indirekte spørsmål', eksempel: 'Jeg vet ikke hvor bor han → hvor han bor', forventet: 'B1', global: 'nei', formater: SETNING },
  { kode: 'O6', navn: 'Manglende eller dobbelt subjekt eller verb', eksempel: 'Jeg glad → Jeg er glad', forventet: 'A2', global: 'ja', formater: SETNING },
  { kode: 'K1', navn: 'Feil bindeord (fordi/derfor, men/selv om)', eksempel: 'Jeg var syk, fordi jeg ble hjemme → derfor ble jeg hjemme', forventet: 'A2–B1', global: 'ja', formater: ['velg_ord', 'bygg_setning'] },
  { kode: 'K2', navn: 'Da, når, hvis, om', eksempel: 'Når jeg var liten → Da jeg var liten', forventet: 'B1', global: 'ja', formater: ORD },
  { kode: 'K3', navn: '«At» og «som»', eksempel: 'Jeg tror som han kommer → at han kommer', forventet: 'B1', global: 'sjelden', formater: ORD },
  { kode: 'K4', navn: 'Ufullstendige setninger (leddsetning alene)', eksempel: 'Fordi jeg var trøtt.', forventet: 'B1', global: 'ja', formater: SETNING },
  { kode: 'L1', navn: 'Forveksling av nærliggende ord', eksempel: 'Jeg tror filmen er bra (har sett den) → synes', forventet: 'A2–B1', global: 'ja', formater: ORD },
  { kode: 'L2', navn: 'Kollokasjoner og faste uttrykk', eksempel: 'gjøre en beslutning → ta en beslutning', forventet: 'B1–B2', global: 'sjelden', formater: ORD },
  { kode: 'L3', navn: 'Preposisjoner for sted og tid', eksempel: 'Jeg bor på Oslo → i Oslo', forventet: 'A2–B1', global: 'sjelden', formater: ORD },
  { kode: 'L4', navn: 'Preposisjon etter verb og adjektiv', eksempel: 'venter for bussen → venter på', forventet: 'B1', global: 'sjelden', formater: ORD },
  { kode: 'L5', navn: 'Retning og plass (hjem/hjemme)', eksempel: 'Jeg går hjemme → hjem', forventet: 'A2', global: 'nei', formater: ORD },
  { kode: 'L6', navn: 'Ord fra andre språk eller oppdiktede ord', eksempel: 'Jeg jobber som cleaner → renholder', forventet: 'B1–B2', global: 'ja', formater: ORD },
  { kode: 'L7', navn: 'Dialekt, nynorsk eller talemål', eksempel: 'ikkje, ka → ikke, hva', forventet: 'B1', global: 'sjelden', formater: ORD },
]

export const FEILKODER = FEILTYPER.map((f) => f.kode)

export function finnFeiltype(kode: string): Feiltype | undefined {
  return FEILTYPER.find((f) => f.kode === kode)
}

// Maks antall feiltyper å øve på per tekst (dok. kap. 1.1, trinn 3).
export function maksFeiltyper(nivaa: Nivaa): number {
  return nivaa === 'A1' ? 1 : 3
}

// Tabellen som legges inn i systemprompten, slik at modellen bruker de samme
// kodene hver gang (dok. kap. 5, «Tips»).
export function feiltypeTabell(): string {
  const rader = FEILTYPER.map((f) => {
    const format = f.formater.join(' eller ')
    return `| ${f.kode} | ${f.navn} | ${f.eksempel} | ${f.forventet} | ${f.global} | ${format} |`
  })
  return [
    '| Kode | Feiltype | Eksempel (feil → rett) | Forventet mestret | Global? | Øvingsformat |',
    '|---|---|---|---|---|---|',
    ...rader,
  ].join('\n')
}
