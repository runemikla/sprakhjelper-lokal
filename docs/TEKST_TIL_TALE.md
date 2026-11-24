# Tekst til tale i lytteøvinger

Lytteøvingene lager lyd med **Google Cloud Text-to-Speech**. ElevenLabs ligger igjen som reserve og kan slås på med en miljøvariabel.

Koden ligger i `lib/tts/`.

## Miljøvariabler (Coolify)

Settes i både testappen (dev) og produksjonsappen (main).

| Variabel | Påkrevd | Forklaring | Eksempel |
|---|---|---|---|
| `GOOGLE_TTS_CREDENTIALS` | Ja (anbefalt) | Hele JSON-nøkkelfilen til en tjenestekonto, limt inn som den er (eller som base64) | `{"type":"service_account",...}` |
| `GOOGLE_TTS_API_KEY` | Alternativ | API-nøkkel. Brukes bare hvis `GOOGLE_TTS_CREDENTIALS` mangler. Noen Google-prosjekter avviser API-nøkler for Text-to-Speech («API keys are not supported by this API»); bruk da tjenestekonto. | (hemmelig) |
| `GOOGLE_TTS_VOICE` | Nei | Stemmen som brukes. Standard er `nb-NO-Chirp3-HD-Leda`. | `nb-NO-Chirp3-HD-Charon`, `nb-NO-Wavenet-A` |
| `GOOGLE_TTS_ENDPOINT` | Nei | Annen API-adresse. Standard er EU-endepunktet `https://eu-texttospeech.googleapis.com`, slik at tekst og lyd blir i Europa. La være å sette den, med mindre du vil bruke det globale endepunktet. | `https://texttospeech.googleapis.com` |
| `TTS_PROVIDER` | Nei | Sett til `elevenlabs` for å bruke ElevenLabs i stedet for Google. | `elevenlabs` |
| `ELEVENLABS_API_KEY` | Bare med `TTS_PROVIDER=elevenlabs` | Nøkkelen til ElevenLabs | (hemmelig) |

## Slik lager du tjenestekonto-nøkkelen

1. Gå til [console.cloud.google.com](https://console.cloud.google.com) og velg prosjektet der **Cloud Text-to-Speech API** er slått på (og fakturering er aktiv).
2. Gå til **IAM & Admin → Service Accounts → Create service account**. Gi den et navn, for eksempel `sprakhjelp-tts`, og trykk **Done**. Den trenger ingen roller for Text-to-Speech.
3. Klikk på tjenestekontoen, gå til fanen **Keys → Add key → Create new key → JSON**. En JSON-fil lastes ned.
4. Åpne filen, kopier hele innholdet og lim det inn som verdien til `GOOGLE_TTS_CREDENTIALS` i Coolify. Deploy appen på nytt.

Hvis organisasjonen din blokkerer nøkkelfiler («Service account key creation is disabled»), må policyen `iam.disableServiceAccountKeyCreation` slås av for prosjektet.

## Stemmer

Norske stemmer finner du i [Googles stemmeliste](https://cloud.google.com/text-to-speech/docs/list-voices-and-types) (filtrer på `nb-NO`). Chirp 3 HD-stemmene (`nb-NO-Chirp3-HD-*`) er de mest naturlige. Wavenet- og Standard-stemmene er billigere.

## Lesehastighet

- **Læreren** velger lesehastighet (Normal, Litt saktere, Sakte) før oppgaven genereres. Det sendes som `speakingRate` til Google (1.0, 0.85 og 0.7), så selve lydfilen blir saktere.
- **Eleven** kan i tillegg sette ned avspillingsfarten i lydspilleren. Det virker også på lytteøvinger som ble laget med ElevenLabs.

## Ordlister i Lær ord: Gemini-stemmer

Lyden i ordlistene (`/api/ordlister/lyd`) lages med Gemini-stemmene, slik som de faste
Lær ord-temaene. Det går på to måter:

1. **Google Cloud TTS på EU-endepunktet** (standard når `GOOGLE_TTS_CREDENTIALS` er satt).
   Tekst og lyd blir i Europa. Modell: `GEMINI_TTS_EU_MODEL`, standard `gemini-2.5-flash-tts`
   (den nyeste Gemini-stemmemodellen på EU-endepunktet). Tjenestekontoen må ha rollen
   **Vertex AI User** (`roles/aiplatform.user`) i Google Cloud i tillegg til Cloud TTS.
2. **Gemini API** (`GEMINI_API_KEY`), bare hvis tjenestekontoen mangler. Den har ingen
   EU-garanti. Modell: `GEMINI_TTS_MODEL`, standard `gemini-3.1-flash-tts-preview`.

Uten noen av dem brukes Google Cloud TTS (Chirp 3 HD) som over.

- Læreren velger stemme i ordliste-editoren (feltet «Stemme») og kan høre hver av de 30
  stemmene med en prøvesetning før hen velger. Listen husker stemmen.
- Bytter læreren stemme, lages lyden på nytt med «Lag det som mangler» eller ved lagring.
- Lyden lagres som WAV.
- Pris: ca. 20 $ per million lydtokens (25 tokens per sekund), altså rundt 0,002 $ per ord
  med setning.
