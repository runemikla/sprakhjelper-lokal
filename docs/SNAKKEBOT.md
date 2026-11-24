# Snakkebot

Elevene snakker norsk med en KI i stedet for å skrive. Læreren lager en snakkebot
(navn, instruks, nivå, første melding og stemme) og deler den med grupper eller med en
kode på fire tegn.

## Slik virker det

1. Eleven trykker på mikrofonen. Nettleseren tar opp lyd som 16 kHz mono WAV
   (`lib/snakkebot/recorder.ts`) og stopper selv etter to sekunder stillhet.
2. `POST /api/snakkebot/transkriber` sender lyden til Google Cloud Speech-to-Text
   (`lib/stt/google.ts`, v2, modell `chirp_3`, språk `no-NO`, region `eu`).
3. `POST /api/snakkebot/svar` sender samtalen og lærerens instruks til språkmodellen
   (`lib/snakkebot/server.ts`, rammeinstruks i `lib/snakkebot/prompt.ts`).
4. `POST /api/snakkebot/lyd` leser svaret opp med Gemini-stemmen læreren valgte.

Eleven kan også skrive svaret. Teksten kan skjules for å øve på å lytte.

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
| `CHATBOT_DEPLOYMENT` | `gpt-6.1-luna` | Navnet på deploymenten i Azure AI Foundry |
| `CHATBOT_API_VERSION` | `v1` | API-versjon |
| `CHATBOT_REASONING_EFFORT` | `low` | For reasoning-modeller: `minimal`, `low`, `medium`, `high` |
| `CHATBOT_PROVIDER` | `azure` | `gemini` for å teste uten Azure (`GEMINI_CHAT_MODEL`) |

### Google Cloud (tale til tekst)
Bruker samme tjenestekonto som tekst til tale (`GOOGLE_TTS_CREDENTIALS`).

1. Slå på **Cloud Speech-to-Text API** i Google Cloud-prosjektet til tjenestekontoen
   (APIs & Services → Library → «Cloud Speech-to-Text API» → Enable).
2. Gi tjenestekontoen rollen **Cloud Speech Client** (IAM → rediger kontoen → Add role).

Valgfrie variabler: `GOOGLE_STT_MODEL` (standard `chirp_3`), `GOOGLE_STT_LOCATION`
(`eu`), `GOOGLE_STT_LANGUAGE` (`no-NO`), `GOOGLE_STT_VERSION` (`v2`, eller `v1` for det
eldre API-et), `GOOGLE_STT_PROJECT` (standard: prosjektet i nøkkelen).

### Gemini (opplesing)
Bruker `GEMINI_API_KEY` som ordlistene. `SNAKKEBOT_TTS=google` bruker Google Cloud TTS
(Chirp 3 HD-stemmene med samme navn) i stedet. Feiler Gemini, brukes Google Cloud TTS
automatisk hvis `GOOGLE_TTS_CREDENTIALS` er satt.

## Mikrofon
`next.config.ts` tillater mikrofonen for Språkhjelp selv (`Permissions-Policy:
microphone=(self)`). Nettleseren spør eleven om lov første gang.
