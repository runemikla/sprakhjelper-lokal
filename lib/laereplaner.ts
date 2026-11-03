// Kompetansemålene som vises på /laereplaner.
//
// NOR11-01: Læreplan i norsk for språklige minoriteter, forberedende opplæring for
// voksne (LK20, Udir, gyldig fra 1.8.2024). Målene er sitert ordrett.
// NVI: Læreplan i norsk for voksne innvandrere (HK-dir, gyldig fra 1.8.2021).
// Målene er sitert ordrett og delt inn etter ferdighet, slik planen gjør.
//
// Planene sier ikke at en modul tilsvarer et CEFR-nivå. Sammenstillingen
// Modul 1 ≈ A1 osv. på siden er en tilnærming.

export interface Modul {
  navn: string
  mal: string[]
}

export type Ferdighet = 'Lytte' | 'Lese' | 'Skrive' | 'Muntlig'

export interface Sprakniva {
  niva: 'A1' | 'A2' | 'B1' | 'B2'
  beskrivelse: string
  ferdigheter: { ferdighet: Ferdighet; mal: string[] }[]
}

export const NOR11_01 = {
  kode: 'NOR11-01',
  tittel: 'Læreplan i norsk for språklige minoriteter – forberedende opplæring for voksne',
  kilde: 'https://www.udir.no/lk20/nor11-01?lang=nob',
  moduler: [
  {
    navn: 'Modul 1',
    mal: [
      'samtale om og prøve ut noen strategier for å lære et nytt språk',
      'gjenkjenne og utforske norske språklyder og norsk stavelsesstruktur, trykk og intonasjon samt uttale noen ord, fraser og enkle setninger på en forståelig måte',
      'gi eksempler på noen språklige likheter og forskjeller mellom norsk og andre språk',
      'bruke noen få innøvde grunnleggende grammatiske strukturer i egne tekster',
      'forstå og bruke enkle fraser for å snakke om seg selv og hverdagslige temaer i dagligdagse samhandlingssituasjoner',
      'forstå og bruke noen grunnleggende hverdagslige og faglige ord og begreper i samtaler',
      'lese, reflektere over og samtale om svært enkle tekster om kjente dagligdagse emner',
      'lese, reflektere over og samtale om svært enkle skjønnlitterære og informative tekster',
      'fylle inn personlige opplysninger i enkle skjemaer',
      'skrive og svare på enkle meldinger og beskjeder',
      'skrive svært enkle fortellende og beskrivende tekster',
      'prøve ut og bruke tilpassede digitale ressurser som støtte i kommunikasjon og læringsarbeid',
      'utforske enkle grunnleggende mønstre for rettskriving, tegnsetting og grammatiske strukturer',
      'samtale om hverdagsliv og tradisjoner i Norge og i andre land',
    ],
  },
  {
    navn: 'Modul 2',
    mal: [
      'bruke enkle strategier for å videreutvikle språkferdigheter',
      'uttale ord og enkle setninger med en stort sett funksjonell uttale',
      'kjenne til og beskrive noen likheter og forskjeller mellom norsk og andre språk',
      'bruke enkle grunnleggende regler for rettskriving, tegnsetting og grammatiske strukturer',
      'bruke egnede digitale ressurser som støtte i kommunikasjon og læringsarbeid',
      'forstå og bruke grunnleggende ord og begreper i samtaler om norskfaglige og tverrfaglige temaer',
      'forstå og følge opp innspill fra andre i hverdagslige og faglige samtaler og stille oppklarende og utdypende spørsmål',
      'samtale om likheter og forskjeller mellom utdanning og arbeidsliv i Norge og andre land',
      'velge tekster ut fra egne interesser og behov i hverdagen, arbeidslivet og samfunnslivet',
      'forstå og gjenfortelle hovedinnholdet i enkle tekster',
      'lese, reflektere over og samtale om enkle informative og skjønnlitterære tekster',
      'skrive og svare på meldinger og beskjeder',
      'skrive en enkel søknad og CV',
      'skrive enkle tekster i ulike sjangre, med støtte i modelltekster',
      'samtale om egne erfaringer med språk- og kulturmøter',
      'gjenkjenne og samtale om språklige og litterære virkemidler i enkle tekster',
    ],
  },
  {
    navn: 'Modul 3',
    mal: [
      'bruke ulike strategier for å videreutvikle språkferdigheter',
      'snakke norsk med en stort sett funksjonell uttale',
      'samtale om og bruke egen flerspråklighet som en ressurs i læring av fag og språk',
      'bruke noen grunnleggende regler for rettskriving, tegnsetting og grammatiske strukturer, og uttrykke seg skriftlig med variasjon i ordforråd og strukturer',
      'velge ut og bruke hensiktsmessige digitale ressurser som støtte i kommunikasjon og læringsarbeid',
      'lytte til og følge opp innspill fra andre og begrunne egne standpunkt i samtaler',
      'presentere seg selv og sin egen kompetanse muntlig og skriftlig, og svare på spørsmål som er aktuelle i forbindelse med jobbintervjuer',
      'finne informasjon og samtale om ulike utdanninger og yrker basert på egne interesser og muligheter',
      'gjenfortelle, forklare og reflektere over innholdet i ulike tekster og begrunne egne synspunkter muntlig og skriftlig',
      'lese egnede saktekster og skjønnlitterære tekster, og samtale om innhold, tema og noen språklige og litterære virkemidler',
      'forstå, formidle og samtale om norskfaglige og tverrfaglige temaer og bruke noe fagspråk',
      'planlegge, strukturere og skrive enkle tekster i ulike sjangre',
      'utforske samspillet mellom skrift, bilder og andre uttrykksformer',
      'reflektere over sammenhenger mellom språk, kultur og identitet',
      'samtale om samisk språk og kultur i fortid og nåtid',
      'reflektere over hvordan man framstiller seg selv og andre i digitale medier',
    ],
  },
  {
    navn: 'Modul 4',
    mal: [
      'bruke hensiktsmessige strategier for å videreutvikle muntlige og skriftlige språkferdigheter',
      'snakke norsk med en funksjonell uttale',
      'uttrykke seg muntlig på en forståelig måte i samhandlingssituasjoner, med et bredt ordforråd og ordvalg som passer i sammenhengen',
      'delta aktivt i faglige diskusjoner med begrunnede meninger og relevante argumenter',
      'trekke ut relevant informasjon fra, oppsummere hovedinnholdet i og reflektere over ulike tekster muntlig og skriftlig',
      'forstå, formidle og samtale om norskfaglige og tverrfaglige temaer med relevant fagspråk',
      'lese egnede saktekster og skjønnlitterære tekster på bokmål og nynorsk, og reflektere over innhold og tema ut fra egne erfaringer og referanserammer',
      'reflektere kritisk over teksters formål, innhold, påvirkningskraft og troverdighet',
      'søke etter relevant informasjon og vurdere informasjonen kritisk',
      'vurdere og bruke ulike digitale ressurser kritisk i kommunikasjon og læringsarbeid',
      'bruke grunnleggende regler for rettskriving, tegnsetting og grammatiske strukturer og uttrykke seg skriftlig med variasjon i ordforråd og strukturer',
      'skrive for å informere, fortelle og argumentere i ulike sjangre, tilpasset formål og mottakere',
      'sammenstille informasjon fra ulike tekster, markere sitater og vise til kilder på en etterprøvbar måte',
      'reflektere over egne ønsker for og muligheter i utdanning og yrkeslivet',
      'gjenkjenne språklige virkemidler i egnede tekster og utforske bruken av språklige virkemidler i egne tekster',
      'bruke egen flerspråklighet som en ressurs i læring av fag og språk',
      'samtale om hvordan holdninger og verdier kommer til uttrykk i ulike tekster fra ulike tider og ulike kulturer',
      'reflektere over flerspråklighet, språklig variasjon og mangfold i Norge og hvordan det norske språket har endret seg over tid',
    ],
  },
  ] satisfies Modul[],
}

export const NVI = {
  tittel: 'Læreplan i norsk for voksne innvandrere',
  kilde: 'https://hkdir.no/ressurser/laereplan-i-norsk-for-voksne-innvandrere',
  nivaer: [
  {
    niva: 'A1',
    beskrivelse:
      'På nivå A1 kan deltakeren forstå og bruke kjente, dagligdagse uttrykk og svært enkle utsagn om seg selv og det kjente og nære. Deltakeren kan delta i svært enkle, kjente samhandlingssituasjoner dersom samhandlingspartnerne tilpasser språket og er støttende.',
    ferdigheter: [
      {
        ferdighet: 'Lytte',
        mal: [
          'gjenkjenne og forstå kjente ord og fraser og helt enkle setninger i samtaler om det kjente og nære',
          'oppfatte hovedinnholdet i veldig enkelt formidlet informasjon i en kjent kontekst',
          'forstå helt enkle meldinger, beskjeder, instruksjoner og stedsanvisninger når de er rettet direkte mot deltakeren selv',
          'forstå tall og uttrykk for mengde, priser og tidsangivelser',
          'oppfatte svært enkel informasjon om kjente emner fra auditivt og audiovisuelt materiale',
          'forstå enkelte uttalevarianter og dialektvarianter av noen av de aller mest frekvente ordene i den lokale dialekten (for eksempel personlige pronomen)',
          'bruke noen svært enkle lyttestrategier, som å utlede betydningen av konkrete, dagligdagse ord ut fra en svært enkel kontekst eller med bakgrunn i likheter med andre språk deltakeren snakker',
        ],
      },
      {
        ferdighet: 'Lese',
        mal: [
          'gjenkjenne kjente navn, kjente ord og svært enkle fraser i enkle autentiske tekster, for eksempel skilt, oppslag, informasjonstavler, nettsider, tabeller og reklamer',
          'lese og forstå svært enkle setninger i korte, enkle meldinger og beskjeder',
          'lese og forstå korte, illustrerte instruksjoner som er svært enkelt formulert',
          'få et inntrykk av innhold som er formidlet i et enkelt språk i svært enkle autentiske informative tekster, spesielt dersom det er støtte i illustrasjoner',
          'lese og forstå svært enkle, tilrettelagte informative og skjønnlitterære tekster, spesielt dersom det er støtte i illustrasjoner',
          'bruke noen enkle lesestrategier, som å utlede betydningen av konkrete, dagligdagse ord ut fra en svært enkel kontekst eller med bakgrunn i likheter med andre språk deltakeren kjenner',
        ],
      },
      {
        ferdighet: 'Skrive',
        mal: [
          'skrive svært enkelt om seg selv og nære forhold, slik som hvor en bor, hva en gjør, og hva en liker og ikke liker',
          'beskrive personer, steder og gjenstander på en svært enkel måte',
          'skrive og svare på svært enkle meldinger om konkrete, kjente emner og personlige behov',
          'skrive og kommentere innlegg på en svært enkel måte i digital kommunikasjon',
          'fylle inn noen personlige opplysninger i svært enkle skjemaer, for eksempel på nettsteder og i apper',
          'bruke tall i for eksempel dato, klokkeslett, mengde og pris i skriftlige tekster',
          'videreformidle innhold i bilder og svært enkle, tilrettelagte tekster',
        ],
      },
      {
        ferdighet: 'Muntlig',
        mal: [
          'bruke svært enkle fraser for å fortelle om seg selv og sin egen bakgrunn',
          'fortelle om og beskrive personer, gjenstander, steder og gjøremål ved hjelp av ord og enkle fraser eller setninger',
          'gi uttrykk for egne behov i dagligdagse samhandlingssituasjoner på en svært enkel måte',
          'samtale om hva en liker og ikke liker, ved å bruke noen faste fraser og svært enkle setninger',
          'stille og svare på svært enkle, direkte spørsmål om personlige forhold og emner fra dagliglivet',
          'svare på enkle, direkte spørsmål om seg selv på en svært enkel måte i en intervjusituasjon',
          'bruke korte, innøvde fraser som passer i dagligdagse samhandlingssituasjoner som for eksempel å takke, hilse og ta farvel',
          'bruke tall og uttrykk for tid, mengder og priser i dagligdagse samhandlingssituasjoner',
          'videreformidle svært enkel informasjon om tid og sted',
          'videreformidle innholdet i bilder og svært enkel muntlig informasjon',
          'samarbeide om svært enkle oppgaver ved å komme med forslag, vise om man forstår eller trenger oppklaring, og spørre om andre forstår',
        ],
      },
    ],
  },
  {
    niva: 'A2',
    beskrivelse:
      'På nivå A2 kan deltakeren forstå klart, enkelt språk og uttrykke seg enkelt om kjente emner knyttet til egen person, nære omgivelser, opplæring og arbeids- og samfunnsliv. Deltakeren kan delta i enkle, kjente samhandlingssituasjoner dersom samhandlingspartnerne tilpasser språket og er innstilt på å hjelpe.',
    ferdigheter: [
      {
        ferdighet: 'Lytte',
        mal: [
          'oppfatte temaet i korte, enkle samtaler',
          'forstå enkel informasjon om et kjent emne med visuell støtte, for eksempel en presentasjon',
          'forstå hovedinnholdet og enkelte detaljer i korte, enkle meldinger, beskjeder, instruksjoner og tids- og stedsanvisninger',
          'oppfatte viktig informasjon om kjente emner fra korte auditive og audiovisuelle klipp, for eksempel nyhetssendinger, dersom det snakkes sakte og tydelig',
          'forstå noen uttalevarianter og noen vanlige dialektord og -uttrykk en møter i dagliglivet',
          'bruke noen enkle lyttestrategier, som å utlede betydningen av konkrete, dagligdagse ord ut fra en enkel kontekst',
        ],
      },
      {
        ferdighet: 'Lese',
        mal: [
          'søke etter, finne og forstå spesifikk, forutsigbar informasjon i enkle, autentiske tekster, for eksempel nettsider, brosjyrer, annonser, skilt og oppslag',
          'lese og forstå enkle meldinger, brev, e-poster og innlegg på sosiale medier',
          'lese og forstå korte instruksjoner som er enkelt formulert og gjerne illustrert',
          'lese og forstå hovedpunkter i korte, enkle nyhetsmeldinger og enkle, tilrettelagte faglige tekster',
          'lese og forstå hovedtrekk i enkle, sammensatte tekster som inneholder svært enkle diagrammer og tabeller',
          'lese og forstå svært enkle skjønnlitterære tekster',
          'bruke noen enkle lesestrategier, som å utlede betydningen av konkrete, dagligdagse ord ut fra en enkel kontekst',
        ],
      },
      {
        ferdighet: 'Skrive',
        mal: [
          'skrive enkelt om egen bakgrunn, opplevelser, interesser og framtidsplaner',
          'notere noen stikkord fra for eksempel et møte eller en enkel presentasjon om et kjent emne',
          'beskrive personer, steder og aktiviteter på en enkel måte',
          'skrive og svare enkelt på meldinger, invitasjoner, forslag og gratulasjoner, samt skrive og kommentere innlegg i digital kommunikasjon på en enkel måte',
          'skrive korte og enkle e-poster og personlige brev',
          'fylle inn opplysninger i de vanligste skjemaene en møter i dagliglivet, for eksempel i digitale tjenester som netthandel, banktjenester, påmeldinger og bestillinger',
          'presentere egen kompetanse i en enkel CV og i et digitalt skjema',
          'uttrykke egne meninger om emner av personlig interesse på en enkel måte',
          'videreformidle innholdet i bilder og enkle tekster',
        ],
      },
      {
        ferdighet: 'Muntlig',
        mal: [
          'fortelle enkelt om egen bakgrunn, kompetanse, ønsker og planer for framtiden',
          'beskrive og fortelle om personer, gjenstander, steder, hendelser og gjøremål på en enkel måte',
          'gi en kort, enkel, forberedt presentasjon om et kjent emne, både med og uten bruk av digitale verktøy',
          'gi enkelt uttrykk for egne behov, meninger og følelser i dagligdagse samhandlingssituasjoner',
          'delta i enkle samtaler om hendelser, opplevelser og praktiske gjøremål i dagligdagse samhandlingssituasjoner',
          'svare på enkle spørsmål om seg selv i en intervjusituasjon',
          'komme med og svare på invitasjoner, forslag, gratulasjoner og beklagelser, samt bruke enkle, vanlige høflighetsfraser',
          'videreformidle enkel, konkret informasjon fra for eksempel klare, tydelige beskjeder og instruksjoner',
          'videreformidle innholdet i bilder og enkel muntlig informasjon',
          'samarbeide om enkle oppgaver ved å komme med forslag, spørre hva andre mener, og be om repetisjon eller omformulering',
          'bruke enkle strategier for å innlede, opprettholde og avslutte en kort samtale',
          'bruke enkle strategier for å kompensere for mangler i ordforrådet, for eksempel ved hjelp av kroppsspråk eller ord fra andre språk som deltakeren kan',
        ],
      },
    ],
  },
  {
    niva: 'B1',
    beskrivelse:
      'På nivå B1 kan deltakeren forstå klart og relativt enkelt språk og uttrykke seg forståelig og sammenhengende om emner knyttet til egen livs-, opplærings- og arbeidssituasjon, kjente samfunnsaktuelle temaer og temaer av personlig interesse. Deltakeren kan delta uforberedt i de fleste samhandlingssituasjoner dersom samhandlingspartnerne uttrykker seg tydelig.',
    ferdigheter: [
      {
        ferdighet: 'Lytte',
        mal: [
          'forstå hovedpoeng og enkelte spesifikke detaljer i samtaler og diskusjoner om emner en kjenner',
          'følge med i klare og strukturerte framstillinger om kjente emner, for eksempel presentasjoner, foredrag eller fortellinger',
          'forstå spesifikke detaljer i meldinger, beskjeder, instruksjoner og anvisninger',
          'forstå hovedpunkter og enkelte spesifikke detaljer i auditivt og audiovisuelt materiale, for eksempel nyhetssendinger, podkaster og filmer',
          'forstå en del uttalevarianter og vanlige dialektord og -uttrykk en møter i dagliglivet',
          'bruke lyttestrategier som å forstå ord ut fra konteksten når temaet er kjent, og å gjette seg til betydningen av ord ut fra de ulike delene ordet er bygd opp av',
        ],
      },
      {
        ferdighet: 'Lese',
        mal: [
          'søke etter, finne og forstå relevant informasjon i ulike hverdagslige informative tekster, for eksempel korte offentlige brev og dokumenter, nettsider og brosjyrer',
          'lese og forstå hverdagslige tekster som brev, e-poster og innlegg på sosiale medier',
          'lese og forstå klare og greie instruksjoner',
          'lese og forstå hovedpoeng i enkle nyhetsartikler og relativt enkle tekster innen eget fag- og interessefelt og vurdere tekstens relevans',
          'lese og forstå hovedtrekk i sammensatte tekster som inneholder enkle grafiske framstillinger, for eksempel diagrammer',
          'lese og forstå enkle skjønnlitterære tekster',
          'bruke lesestrategier som å forstå ord ut fra konteksten når temaet er kjent, og å gjette seg til betydningen av ord ut fra de ulike delene ordet er bygd opp av',
        ],
      },
      {
        ferdighet: 'Skrive',
        mal: [
          'skrive enkle sammenhengende tekster om erfaringer, opplevelser, interesseområder, ambisjoner og framtidsplaner som inneholder en del detaljerte beskrivelser',
          'notere hovedpunkter fra et møte eller en faglig presentasjon om et kjent emne, formidlet med et relativt enkelt språk',
          'skrive korte rapporter knyttet til egen opplærings- og arbeidssituasjon',
          'beskrive personer, steder, hendelser og opplevelser på en detaljert måte',
          'skrive og kommentere personlige innlegg og delta i diskusjoner om kjente emner i digital kommunikasjon',
          'skrive enkle, formelle e-poster og brev, for eksempel i forbindelse med en jobbsøknad',
          'skrive inn opplysninger i ulike typer skjemaer i digitale tjenester en møter i dagliglivet',
          'uttrykke og kort begrunne meninger i enkle sammenhengende tekster',
          'gjengi innholdet i enkle skjønnlitterære tekster',
          'sammenfatte og videreformidle relevant informasjon fra klart formulerte tekster om kjente emner',
          'bruke strategier for å kompensere for mangler i ordforrådet, for eksempel ved å omformulere',
          'bruke ulike skrivestrategier, for eksempel for å framheve det man mener er viktigst i en tekst',
        ],
      },
      {
        ferdighet: 'Muntlig',
        mal: [
          'delta i de fleste muntlige samhandlingssituasjoner i dagliglivet',
          'fortelle om erfaringer, følelser, drømmer, planer og ambisjoner',
          'beskrive relativt detaljert personer, gjenstander, hendelser og opplevelser',
          'holde en forberedt presentasjon om et kjent emne, både med og uten bruk av digitale verktøy',
          'beskrive et problem, be om råd og forstå et klart formulert svar',
          'fortelle om, forklare og kort begrunne egne handlinger og planer',
          'gjenfortelle handlingen i et narrativ, for eksempel fra en film',
          'starte eller gå uforberedt inn i, opprettholde og avslutte enkle samtaler og diskusjoner om kjente emner',
          'presentere seg selv og egen kompetanse og svare på spørsmål i forbindelse med et intervju',
          'uttrykke og kort begrunne egne meninger i diskusjoner og på møter om kjente emner',
          'videreformidle relevant informasjon fra for eksempel beskjeder og instruksjoner',
          'samarbeide om oppgaver ved å invitere andre til å delta, bidra med innspill, spørre om hvorfor noen mener noe, og bekrefte en felles forståelse før en fortsetter',
          'bruke strategier for å kompensere for mangler i ordforrådet, for eksempel ved å fornorske ord fra andre språk han/hun kan',
          'bruke ulike samhandlingsstrategier, for eksempel å gripe inn i en diskusjon om velkjente emner og få ordet ved hjelp av en passende frase',
        ],
      },
    ],
  },
  {
    niva: 'B2',
    beskrivelse:
      'På nivå B2 kan deltakeren forstå komplekst språk og uttrykke seg saklig, klart og nyansert om et vidt spekter av allmenne emner og emner innenfor eget fagfelt og egne interesseområder. Deltakeren kan uttrykke og respondere på synspunkter og argumenter og delta i samhandlingssituasjoner med et så spontant og flytende språk at kommunikasjonen ikke blir anstrengende for noen av partene.',
    ferdigheter: [
      {
        ferdighet: 'Lytte',
        mal: [
          'forstå det meste av det som blir sagt, og oppfatte holdninger og synspunkter i samtaler, diskusjoner og debatter',
          'følge komplekse argumentasjonsrekker hvis emnet er relativt kjent og overgangene mellom argumentene er tydelig markert',
          'oppfatte hovedinnholdet i akademiske eller yrkesmessige presentasjoner innenfor eget fag- og interessefelt',
          'forstå informasjon i meldinger, beskjeder og detaljerte instruksjoner',
          'forstå det meste av innholdet i auditivt og audiovisuelt materiale, for eksempel nyhetssendinger, dokumentarer, film og podkaster på en kjent dialekt',
          'forstå dialekter når den som snakker, tilpasser språket ved behov',
          'bruke en rekke lyttestrategier for å oppnå forståelse, blant annet prøve å få tak i hovedpunkter og sjekke om han eller hun har forstått budskapet riktig, ved hjelp av signaler i konteksten',
        ],
      },
      {
        ferdighet: 'Lese',
        mal: [
          'lese og forstå det vesentligste innholdet i informasjonsutveksling, for eksempel i formelle brev, e-poster og sosiale medier',
          'lese og forstå komplekse instruksjoner og bruksanvisninger knyttet til eget fagfelt',
          'følge argumentasjonsrekker i ulike tekster om samfunnsaktuelle temaer og fra eget fagfelt',
          'lese og forstå sammensatte tekster som inneholder grafiske framstillinger, for eksempel ulike typer diagrammer',
          'lese og forstå et utvalg av skjønnlitterære tekster',
          'skumlese lange og komplekse tekster og vurdere relevansen av innholdet',
          'søkelese lange tekster og finne relevante detaljer',
          'bruke hensiktsmessige søketeknikker og lesemåter for å finne relevant informasjon fra ulike nettsteder',
          'bruke en rekke lesestrategier for å oppnå forståelse, blant annet prøve å få tak i hovedpunkter og sjekke om han/hun har forstått budskapet riktig, ved hjelp av signaler i konteksten',
          'bruke ulike lesestrategier for å oppfatte hovedtrekk i en tekst på den målformen han/hun har minst kjennskap til',
        ],
      },
      {
        ferdighet: 'Skrive',
        mal: [
          'skrive klare og detaljerte redegjørende tekster',
          'bearbeide, sammenfatte og videreformidle på en pålitelig måte hovedinnholdet i komplekse tekster om emner knyttet til eget fag- og interessefelt',
          'ta hensiktsmessige notater fra et møte, en presentasjon eller forelesning innen eget fag- og interessefelt',
          'skrive rapporter og referater knyttet til eget fag- og interessefelt',
          'beskrive hendelser, opplevelser og følelser på en klar, detaljert og nyansert måte',
          'uttrykke egne meninger og diskutere og kommentere andres innspill i digital kommunikasjon',
          'skrive detaljerte beskjeder, e-poster og brev tilpasset mottaker og formål',
          'skrive tekster der en utvikler et argument, gir grunner for eller imot et bestemt synspunkt og drøfter fordelene og ulempene ved ulike alternativer',
          'skrive faglige tekster innenfor eget fag- og interessefelt der en sammenfatter og bruker informasjon fra ulike kilder kritisk, uttrykker og underbygger egne synspunkter og trekker konklusjoner',
          'skrive og bearbeide klare og detaljerte tekster tilpasset situasjon og formål',
          'bruke ulike skrivestrategier tilpasset konteksten, sjangeren og formålet med skrivingen',
        ],
      },
      {
        ferdighet: 'Muntlig',
        mal: [
          'beskrive erfaringer, hendelser og forventninger på en nyansert og presis måte',
          'gi kompleks informasjon og klare, detaljerte instruksjoner og beskjeder',
          'holde velstrukturerte, forberedte presentasjoner, både med og uten bruk av digitale verktøy',
          'presentere en sak eller en problemstilling og begrunne eget syn på saken ved å utvikle og underbygge argumentene sine med underpunkter og relevante eksempler',
          'ta initiativ og følge opp det som blir sagt i samtaler og diskusjoner, og bidra til at samtalen flyter',
          'samtale om mange ulike temaer med spontanitet og flyt og tilpasse språket til den aktuelle samhandlingssituasjonen',
          'presentere seg selv og sin egen kompetanse på en passende måte og svare utfyllende på spørsmål i forbindelse med et jobbintervju',
          'delta i samtaler der en uttrykker følelser på en nyansert måte, framhever den personlige betydningen av hendelser og opplevelser og responderer på en passende måte',
          'argumentere for egne synspunkter i diskusjoner og møter innen eget fag- og interessefelt på en saklig og nyansert måte',
          'sammenfatte og videreformidle på en pålitelig måte hovedinnholdet i kompleks informasjon knyttet til eget fag- og interessefelt',
          'samarbeide om å løse oppgaver ved å diskutere ulike alternativer, kommentere andres innspill og komme med egne forslag',
          'takle de fleste kommunikasjonsproblemer ved å omformulere eller unngå vanskelige uttrykk',
          'innlede, opprettholde og avslutte en samtale på en passende måte, med effektiv turtaking',
        ],
      },
    ],
  },
  ] satisfies Sprakniva[],
}
