# Utviklingsplan: Mattehjelp i Språkhjelp

Dato: 2026-11-03 · Status: forslag, ingen kode skrevet ennå

## 1. Sammendrag

Mattehjelp blir et nytt KI-verktøy på `/mattehjelp` i Språkhjelp som bygger på samme mønster som Skrivehjelp: eleven skriver inn en matematikkoppgave, KI-en løser den på serveren, og eleven får ett steg om gangen med veiledning til hen har løst oppgaven selv. Første versjon kan lages uten nye tabeller i Supabase og uten innlogging, akkurat som Skrivehjelp.

Målet er at eleven lærer å regne, ikke å skrive av et svar. Det viktigste kravet er derfor at løsningen aldri sendes til nettleseren før eleven har kommet fram til den. Tekstene er på enkel norsk med forklaring på morsmålet, fordi elevene har norsk som andrespråk og også skal lære fagspråket i matematikk.

## 2. Om Språkhjelp (kontekst for planen)

- **Hva:** Nettsted med KI-verktøy for elever med norsk som andrespråk. I produksjon på sprakhjelp.no. Eier og utvikler: Rune.
- **Repo:** `runemikla/sprakhjelper-lokal` på GitHub.
- **Stack:** Next.js (App Router, TypeScript, Tailwind, shadcn/ui), pakkebehandler pnpm.
- **Hosting:** Hetzner via Coolify (ikke Vercel, selv om eldre dokumenter nevner Vercel). Produksjonsappen bygger fra `main` (sprakhjelp.no). En testapp bygger fra `dev` (test.sprakhjelp.no). Miljøvariabler settes per app i Coolify, og nye variabler krever Redeploy.
- **Arbeidsflyt:** Lag egen branch fra `dev`, åpne PR mot `dev` (aldri direkte mot `main`). Rune merger, tester på test.sprakhjelp.no, og lager så PR `dev → main` for å publisere.
- **Database:** Supabase, prosjekt «Hallaien». Test og prod deler samme database. Rune kjører SQL-migrasjoner selv i SQL Editor; filene ligger i `supabase/migrations/`.
- **Språkmodell:** Azure AI Foundry (Azure OpenAI). Alle KI-ruter kaller `azureChatCompletion()` i `lib/ai/azure.ts`. Aktiv modell velges på admin-siden `/sprakmodell` (tabell `ai_models`), med reserve i miljøvariablene `AZURE_OPENAI_*`. Modellen i bruk er gpt-6.1-terra (resonneringsmodell). Andre deployments: gpt-5.6-luna/terra/sol, gpt-5.4, gpt-4.1, gpt-4.1-mini, gpt-4o.
- **Systeminstrukser:** Standardtekstene ligger i `lib/ai/instructions.ts`. Admin kan lage og aktivere egne versjoner på `/instrukser` (tabell for instruksversjoner, hentet med `getInstruction()` i `lib/ai/instruction-store.ts`, 30 sekunders cache).
- **Ratebegrensning:** `checkRateLimit(req, grense, vindu)` i `lib/api-helpers.ts`, i minnet per rute og IP (standard 10 kall per minutt).
- **Endringslogg:** Brukervendt logg i `lib/endringslogg.ts` (nyeste øverst, typene `nytt`, `forbedret`, `rettet`), vist på `/endringslogg`. Se `docs/ENDRINGSLOGG.md`.
- **Språk:** All tekst til brukere er på norsk (bokmål). Rune skriver på norsk.

## 3. Slik er Skrivehjelp bygd (det vi gjenbruker)

| Del | Skrivehjelp i dag | Bruk i Mattehjelp |
| --- | --- | --- |
| Side | `app/spraakhjelper/page.tsx` henter bruker og admin-status, `spraakhjelper-client.tsx` (ca. 1 370 linjer) styrer hele flyten med `useState` | Samme oppbygning, men delt i mindre komponenter under `components/mattehjelp/` |
| Morsmål | Eleven velger morsmål først; alle forklaringer kommer på norsk og morsmål med en knapp for å bytte | Gjenbrukes direkte, samme språkliste |
| API-ruter | Fire ruter: setningsdeling, analyse, setningssjekk, sammendrag. Alle bruker zod-validering, `checkRateLimit`, `getInstruction`, `azureChatCompletion` og JSON Schema (`response_format: json_schema, strict: true`) | Samme oppskrift for tre nye ruter |
| Instrukser | Nøklene `skrivehjelp_analyse`, `_setningsdeling`, `_setningssjekk`, `_sammendrag` i `INSTRUCTION_DEFINITIONS`, redigerbare på `/instrukser` | Nye nøkler `mattehjelp_*` med `tool: 'Mattehjelp'` |
| Steg for steg | Eleven går gjennom én setning om gangen, prøver på nytt, får «riktig»/«feil»-bilde og forklaring | Samme rytme, men per regnesteg |
| Lagring | `sessionStorage` i nettleseren, ingenting i databasen | Samme i fase 1, men løsningen må ikke ligge der (se under) |
| Sammendrag | Egen rute lager «hva var bra / hva kan bli bedre» og PDF med jsPDF | Kan gjenbrukes i fase 3 |
| Nivå | Skrivehjelp har ingen nivåstyring. Grammatikk/ordrekkefølge har `LEVEL_SPECS` (sju nivåer) i `instructions.ts` | Mattenivå sendes som variabel til instruksen |

**Viktig forskjell:** I Skrivehjelp sendes fasitsetningen (`riktig_setning`) til nettleseren, og `/api/check-sentence-azure` får den tilbake fra klienten. For matte går ikke det, fordi eleven da kan se svaret i nettleserens utviklerverktøy. Mattehjelp må holde løsningen på serveren.

## 4. Brukerflyt og skjermbilder

1. **Start:** Eleven velger morsmål og (valgfritt) nivå, og skriver eller limer inn oppgaven. Et lite verktøy for symboler (brøk, potens, rot, ×, ÷) hjelper på mobil. Forhåndsvisning viser oppgaven pent satt med matematisk notasjon.
2. **Oppgaven forstått:** KI-en gjengir oppgaven med egne ord på enkel norsk og viser hvor mange steg det blir (for eksempel «Vi løser dette i 4 steg»). Eleven bekrefter at oppgaven er lest riktig, eller retter den.
3. **Steg for steg:** For hvert steg vises et mål («Finn hvor mye 3 kg epler koster»), et svarfelt og knappen «Sjekk». Eleven skriver utregningen eller svaret.
4. **Tilbakemelding:** Riktig gir grønt merke og neste steg. Feil gir et hint om hva som må rettes, uten svaret. Etter tre forsøk kan eleven be om et sterkere hint, og etter fem kan hen se hvordan steget løses (dette steget, ikke hele oppgaven).
5. **Ferdig:** Når siste steg er riktig, vises hele elevens egen løsning samlet, med nøkkelord (fagord) forklart på norsk og morsmål. Eleven kan starte ny oppgave eller laste ned som PDF.

Skjermbildene følger Skrivehjelp: kort øverst med oppgaven, framdriftslinje med steg (1 av 4), hovedkort for gjeldende steg, og forklaringsboks med bytte mellom norsk og morsmål.

## 5. API-ruter og promptdesign

### Ruter

| Rute | Hva den gjør | Ratebegrensning |
| --- | --- | --- |
| `POST /api/mattehjelp/start` | Tar oppgave, morsmål og nivå. Modellen løser oppgaven og deler den i steg. Returnerer bare det eleven skal se (omformulering, antall steg, mål for steg 1) og en signert, kryptert økt-token som inneholder hele løsningen | 5 per minutt |
| `POST /api/mattehjelp/sjekk-steg` | Tar token, stegnummer, elevens svar og antall forsøk. Modellen sammenligner med løsningen i tokenet og gir veiledning. Ved riktig svar returneres neste stegs mål | 15 per minutt |
| `POST /api/mattehjelp/sammendrag` (fase 3) | Lager oppsummering og fagord-liste når oppgaven er ferdig | 5 per minutt |

**Holde løsningen skjult:** Løsningen krypteres med AES-GCM og en hemmelig nøkkel (`MATTEHJELP_SECRET` i Coolify) og sendes som en ugjennomsiktig token. Nettleseren kan lagre tokenet i `sessionStorage`, men kan ikke lese det. Tokenet har utløpstid (for eksempel 2 timer). Dette krever ingen database. Alternativet er å lagre økten i Supabase (se datamodell), som også gir lærerstatistikk.

### Instrukser (nye nøkler i `lib/ai/instructions.ts`)

- `mattehjelp_losning`: løs oppgaven, sjekk svaret ditt selv, del i 2–6 steg der hvert steg er én tanke, skriv mål for hvert steg uten å røpe svaret, list akseptable delsvar og andre gyldige løsningsveier. Variabler: `morsmaal`, `nivaa`.
- `mattehjelp_stegsjekk`: sammenlign elevens svar med forventet delsvar og alternative veier. Godta ekvivalente uttrykk (0,5 = 1/2 = 50 %, desimalkomma og punktum, ulik rekkefølge). Gi aldri tallet eleven skal fram til. Pek på det første som er feil og spør et ledende spørsmål. Variabler: `morsmaal`, `nivaa`, `forsok`.
- `mattehjelp_sammendrag` (fase 3).

### JSON-skjema (strukturert svar, slik Skrivehjelp gjør)

Fra `start`: `forstatt` (bool, om oppgaven er en matteoppgave), `omformulering`, `omformulering_morsmaal`, `steg[]` med `maal`, `maal_morsmaal`, `forventet_svar`, `godtatte_svar[]`, `metode`, og `endelig_svar`. Alt unntatt `omformulering*`, antall steg og første `maal` blir i tokenet.

Fra `sjekk-steg`: `status` (`riktig`, `delvis`, `feil`, `annen_vei`), `tilbakemelding`, `tilbakemelding_morsmaal`, `hint_niva` (1–3).

### Matematisk notasjon

- Modellen skriver formler i LaTeX mellom `$...$`. Visning med KaTeX (`remark-math` + `rehype-katex` sammen med `react-markdown`, som allerede er i prosjektet). KaTeX trenger ingen ekstern tjeneste, så CSP-en i `next.config.ts` trenger bare at CSS/fonter lastes lokalt.
- Eleven skriver vanlig tekst (`3/4`, `x^2`, `2,5`). Fase 2 kan legge til MathLive-felt for pen inntasting på nettbrett.
- Tallsjekk: før modellen spørres kan serveren prøve en rask sjekk med et regnebibliotek (for eksempel mathjs) når forventet svar er et tall. Det gjør riktige svar raske og billige og reduserer feil fra modellen.

### Flere gyldige løsningsveier

Løsningssteget lister alternative metoder. Hvis eleven velger en annen gyldig vei, svarer stegsjekken `annen_vei`. Da lages resten av stegene på nytt ut fra elevens vei (et nytt kall til `start`-logikken med elevens arbeid som kontekst), og tokenet byttes ut.

### Modellvalg

Resonneringsmodellen (gpt-6.1-terra) passer best til selve løsningen. Stegsjekken kan gå på en billigere modell. Dette krever enten styring av modell per verktøy i admin (foreslått tabell `ai_model_assignments`, ikke laget ennå) eller en midlertidig miljøvariabel `MATTEHJELP_DEPLOYMENT`, slik ordlister gjør med `ORDLISTER_DEPLOYMENT`.

## 6. Datamodell i Supabase

**Fase 1: ingen nye tabeller.** Økten ligger i det krypterte tokenet og i `sessionStorage`, som i Skrivehjelp. Nye instruksnøkler bruker den eksisterende instruksversjon-tabellen. Det er ingen migrasjon å kjøre.

**Fase 3 (valgfritt, når lærere vil se bruk):**

| Tabell | Kolonner (forslag) | Formål |
| --- | --- | --- |
| `math_sessions` | `id`, `user_id` (null for gjester), `group_id` (null), `oppgave`, `nivaa`, `morsmaal`, `losning` (jsonb, aldri lesbar for elev via RLS), `status`, `created_at`, `finished_at` | Lagrer økten på serveren i stedet for token, gir lærerstatistikk |
| `math_attempts` | `id`, `session_id`, `steg`, `svar`, `status`, `hint_niva`, `created_at` | Hvert forsøk, for å se hvor elevene står fast |
| `math_tasks` (senere) | `id`, `owner_id`, `tekst`, `nivaa`, `tema`, `losning` | Lærerlagde oppgaver som kan deles med grupper, som ordlister i dag |

RLS: elever ser bare egne økter uten `losning`-kolonnen (via en view eller en sikker funksjon), lærere ser økter i egne grupper, admin ser alt. Migrasjonen kjøres av Rune i «Hallaien».

## 7. Faser og milepæler

| Fase | Innhold | Ferdig når |
| --- | --- | --- |
| 0. Avklaring | Svar på åpne spørsmål, velg nivåskala og målgruppe, test 20 typiske oppgaver manuelt mot gpt-6.1-terra | Rune har godkjent promptutkast og eksempler |
| 1. MVP | Side `/mattehjelp`, rutene `start` og `sjekk-steg`, kryptert token, KaTeX-visning, morsmål, instrukser på `/instrukser`, meny og endringslogg | Eleven kan løse en tekstoppgave i 3–5 steg på test.sprakhjelp.no uten å kunne se svaret |
| 2. Kvalitet | Tallsjekk med mathjs, flere løsningsveier (`annen_vei`), hint i tre nivåer, symbolverktøy på mobil, tester med et sett faste oppgaver | Minst 90 % riktig vurdering på testsettet |
| 3. Lærer og lagring | Sammendrag og PDF, `math_sessions`/`math_attempts`, lærervisning per gruppe, valgfritt lærerlagde oppgaver | Lærer ser hvor elevene i en gruppe står fast |
| 4. Utvidelser | Bilde av oppgaven (foto fra bok), lyd/opplesning av oppgaven, kobling til læreplanmål | Etter behov |

Hver fase leveres som egen PR fra en branch av `dev` mot `dev`.

## 8. Risikoer

| Risiko | Konsekvens | Tiltak |
| --- | --- | --- |
| Modellen regner feil | Eleven får beskjed om at riktig svar er feil | Resonneringsmodell, selvsjekk i prompten, tallsjekk med mathjs, knapp «Jeg tror jeg har rett» som ber om ny vurdering |
| Løsningen lekker | Eleven kopierer svaret | Kryptert token eller lagring på server, aldri fasit i klienten, prompt som nekter å gi tall i hint |
| Eleven ber modellen om svaret i svarfeltet («gi meg svaret») | Svaret røpes | Elevtekst sendes som data, ikke instruks; JSON-skjema; vakthold i prompten |
| Ikke-matte eller upassende innhold | Feil bruk | `forstatt = false` gir vennlig melding |
| Kostnad med resonneringsmodell | Høyere pris per oppgave | Billigere modell til stegsjekk, tallsjekk uten KI, ratebegrensning |
| Lang ventetid ved start (resonnering) | Eleven gir opp | Lasteanimasjon som i Skrivehjelp, `reasoning_effort` lav/middels |
| Notasjon på mobil | Vanskelig å skrive brøk og potens | Symbolverktøy, godta enkel tekst som `3/4` og `x^2` |
| Ratebegrensningen ligger i minnet | Nullstilles ved omstart, gjelder per IP (hele klasser bak én IP) | Høyere grense for `sjekk-steg`; senere Redis eller Supabase |

## 9. Åpne spørsmål til Rune

1. Hvilke elever og hvilket nivå er målet: grunnskole for voksne, videregående (1P/1T), eller begge? Hvilken nivåskala skal brukes?
2. Skal Mattehjelp kreve innlogging, eller være åpen for gjester som Skrivehjelp?
3. Hvor mange forsøk før eleven kan se hvordan et steg løses, og skal læreren kunne skru det av?
4. Skal lærere kunne lage og dele oppgaver med grupper (som ordlister), eller skriver eleven alltid inn oppgaven selv?
5. Skal forklaringene også lære fagord (for eksempel «nevner», «teller», «ligning») med oversettelse, slik at verktøyet blir både matte og språk?
6. Er foto av oppgaven viktig tidlig? Det krever bildeopplasting og en modell som leser bilder.
7. Er det greit å bruke gpt-6.1-terra til løsningen selv om den er dyrere, og en billigere modell til stegsjekk?
8. Skal verktøyet hete «Mattehjelp» i menyen, og ligge under KI-verktøy ved siden av Skrivehjelp?
