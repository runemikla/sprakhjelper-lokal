# Snakkebot

Elevene snakker norsk med en KI i stedet for å skrive. Læreren lager en snakkebot
(navn, instruks, nivå, første melding og stemme) og deler den med grupper eller med en
kode på fire tegn.

## Slik virker det

1. Eleven trykker på mikrofonen. Nettleseren tar opp lyd som 16 kHz mono WAV
   (`lib/snakkebot/recorder.ts`) og stopper selv etter to sekunder stillhet.
2. `POST /api/snakkebot/transkriber` sender lyden til Google Cloud Speech-to-Text
   (`lib/stt/google.ts`, v1 via EU-endepunktet, språk `no-NO`; v2 med `chirp_3` kan slås på).
3. `POST /api/snakkebot/svar` sender samtalen og lærerens instruks til språkmodellen
   (`lib/snakkebot/server.ts`, rammeinstruks i `lib/snakkebot/prompt.ts`). Svaret
   strømmes tilbake (NDJSON) mens modellen skriver.
4. Så snart en setning er ferdig, sender nettleseren den til `POST /api/snakkebot/lyd`,
   som leser den opp med Google Cloud-stemmen (Chirp 3 HD) læreren valgte. Første
   setning spilles mens resten skrives, og setningene spilles i rekkefølge.

Under mikrofonen står bare ett ord: Lytter, Tenker, Snakker eller Din tur.

**Tidsmåling:** administratorer ser under samtalen hvor lang tid hvert steg tok (tale
til tekst, første ord fra modellen, hele svaret, når lyden starter og totalt fra eleven
sluttet å snakke). I automatisk modus kommer pausen før sending i tillegg.

Eleven kan også skrive svaret.

**Talemodus** (Innstillinger i samtalen, lagres i nettleseren og gjelder alle snakkeboter):
- *Automatisk* (standard): mikrofonen åpner seg når snakkeboten er ferdig, og svaret
  sendes når eleven har vært stille i valgt pause (0,3–3 s, standard 1,5 s). Ingen tale
  på 10 s avslutter samtalen (se Tidsgrenser).
- *Manuell*: trykk på mikrofonen for å snakke og igjen for å sende (sendes også selv etter
  10 s stillhet).

**Tidsgrenser** (`LIMITS` i `lib/snakkebot/types.ts`):
- En samtale varer i høyst 5 minutter (`conversationSeconds`). Tiden som er igjen, vises
  øverst. Når tiden er ute, sendes neste forespørsel med `ending: true`, og modellen får
  beskjed om å svare kort og si ha det (`END_INSTRUCTION` i `prompt.ts`). Deretter avsluttes
  samtalen. Sitter ingen og snakker når tiden går ut, avsluttes den med en gang.
- Er mikrofonen åpen i 10 sekunder uten tale (`silenceEndSeconds`), avsluttes samtalen og
  mikrofonen lukkes. Eleven kan trykke «Fortsett samtalen» (så lenge tiden ikke er ute)
  eller «Ny samtale».
- Grensene gjelder i nettleseren. «Ny samtale» starter klokken på nytt.
- Talehastighet (0,75–1,3×) og «Skjul meldingene» (bare lytt og snakk).

**Hvem gjør hva:** bare administratorer lager og endrer snakkeboter. Lærere ser alle
snakkebotene med kode (etter `20261124200000_chatbots_admin_only.sql`). Elever ser dem
som er delt med gruppene deres, eller åpner med kode.

Ingenting fra samtalen lagres: nettleseren holder samtalen og sender den med hver
forespørsel. Bare lærerens innstillinger ligger i databasen (`chatbots`,
`chatbot_groups`, se `supabase/migrations/20261124120000_create_chatbots.sql`).

Sider: `/snakkebot` (lærer: liste; elev: kode og snakkeboter fra gruppene),
`/snakkebot/ny`, `/snakkebot/<id>/rediger`, `/snakkebot/<id eller KODE>` (samtale).

## Oppsett

### Supabase
Kjør `supabase/migrations/20261124120000_create_chatbots.sql` i SQL Editor (Hallaien).

### Azure (språkmodell)
Snakkebot bruker sin egen deployment, uavhengig av valget på «Språkmodell»-siden.
Endepunkt og nøkkel kommer fra `AZURE_OPENAI_ENDPOINT` og `AZURE_OPENAI_API_KEY`.

| Variabel | Standard | Forklaring |
|---|---|---|
| `CHATBOT_DEPLOYMENT` | `gpt-6-luna` | Navnet på deploymenten i Azure AI Foundry |
| `CHATBOT_API_VERSION` | `v1` | API-versjon |
| `CHATBOT_REASONING_EFFORT` | laveste modellen godtar | For reasoning-modeller. Uten verdi prøves `none`, så `minimal`, så `low` (raskest svar) |
| `CHATBOT_PROVIDER` | `azure` | `gemini` for å teste uten Azure (`GEMINI_CHAT_MODEL`) |

**Feilsøking:** åpne `/api/snakkebot/sjekk` som administrator. Den viser hvilken deployment,
API-versjon og hvilket endepunkt som brukes, og sender en testmelding. Administratorer ser
også Azure-feilkoden direkte i samtalen; elever ser en generell melding.

**Innholdsfilter:** stopper Azure (eller Gemini) en tur, ofte fordi tale til tekst hørte feil,
får eleven beskjed om å si det på nytt. Den siste replikken fjernes, så samtalen kan fortsette.
Er filteret for strengt, kan det justeres for deploymenten i Azure AI Foundry (Guardrails).

### Google Cloud (tale til tekst)
Bruker samme tjenestekonto som tekst til tale (`GOOGLE_TTS_CREDENTIALS`).

Slå på **Cloud Speech-to-Text API** i Google Cloud-prosjektet til tjenestekontoen
(APIs & Services → Library → «Cloud Speech-to-Text API» → Enable). Standard er v1-API-et
(`eu-speech.googleapis.com`), som ikke trenger noen ekstra IAM-rolle.

Bedre gjenkjenning: `GOOGLE_STT_VERSION=v2` bruker modellen `chirp_3` i EU. Da må
tjenestekontoen ha rollen **Cloud Speech Client** (krever IAM-tilgang i prosjektet).

Valgfrie variabler: `GOOGLE_STT_VERSION` (`v1` eller `v2`), `GOOGLE_STT_MODEL` (v2:
`chirp_3`), `GOOGLE_STT_LOCATION` (v2: `eu`), `GOOGLE_STT_LANGUAGE` (`no-NO`),
`GOOGLE_STT_PROJECT` (standard: prosjektet i nøkkelen).

Mangler tilgang, viser appen en forklaring (API ikke slått på, mangler rolle osv.), og
den fulle feilen logges på serveren.

### Opplesing
Bruker Google Cloud tekst til tale som Lytteøving (`GOOGLE_TTS_CREDENTIALS`, valgfritt
`GOOGLE_TTS_ENDPOINT`), stemmene `nb-NO-Chirp3-HD-<navn>`. Ingen ekstra oppsett.
`SNAKKEBOT_TTS=gemini` bruker Gemini-stemmene med samme navn i stedet (`GEMINI_API_KEY`).

## Mikrofon
`next.config.ts` tillater mikrofonen for Språkhjelp selv (`Permissions-Policy:
microphone=(self)`). Nettleseren spør eleven om lov første gang.
