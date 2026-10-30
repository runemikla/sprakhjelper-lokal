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
| `GOOGLE_TTS_ENDPOINT` | Nei | Annen API-adresse, for eksempel EU-endepunktet. Standard er `https://texttospeech.googleapis.com`. | `https://eu-texttospeech.googleapis.com` |
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
