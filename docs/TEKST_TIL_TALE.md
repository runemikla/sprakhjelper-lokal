# Tekst til tale i lytteøvinger

Lytteøvingene lager lyd med **Google Cloud Text-to-Speech**. ElevenLabs ligger igjen som reserve og kan slås på med en miljøvariabel.

Koden ligger i `lib/tts/`.

## Miljøvariabler (Coolify)

Settes i både testappen (dev) og produksjonsappen (main).

| Variabel | Påkrevd | Forklaring | Eksempel |
|---|---|---|---|
| `GOOGLE_TTS_API_KEY` | Ja | API-nøkkel fra Google Cloud med tilgang til Cloud Text-to-Speech API | (hemmelig) |
| `GOOGLE_TTS_VOICE` | Nei | Stemmen som brukes. Standard er `nb-NO-Chirp3-HD-Leda`. | `nb-NO-Chirp3-HD-Charon`, `nb-NO-Wavenet-A` |
| `GOOGLE_TTS_ENDPOINT` | Nei | Annen API-adresse, for eksempel EU-endepunktet. Standard er `https://texttospeech.googleapis.com`. | `https://eu-texttospeech.googleapis.com` |
| `TTS_PROVIDER` | Nei | Sett til `elevenlabs` for å bruke ElevenLabs i stedet for Google. | `elevenlabs` |
| `ELEVENLABS_API_KEY` | Bare med `TTS_PROVIDER=elevenlabs` | Nøkkelen til ElevenLabs | (hemmelig) |

## Slik lager du API-nøkkelen

1. Gå til [console.cloud.google.com](https://console.cloud.google.com) og velg eller lag et prosjekt.
2. Slå på fakturering for prosjektet (Text-to-Speech har en gratiskvote, men krever betalingskort).
3. Gå til **APIs & Services → Library**, søk etter **Cloud Text-to-Speech API** og trykk **Enable**.
4. Gå til **APIs & Services → Credentials → Create credentials → API key**.
5. Trykk **Edit API key** på den nye nøkkelen. Under **API restrictions** velger du **Restrict key** og krysser bare av for **Cloud Text-to-Speech API**. La **Application restrictions** stå på **None**, siden nøkkelen bare brukes fra serveren.
6. Kopier nøkkelen inn i `GOOGLE_TTS_API_KEY` i Coolify og deploy appen på nytt.

## Stemmer

Norske stemmer finner du i [Googles stemmeliste](https://cloud.google.com/text-to-speech/docs/list-voices-and-types) (filtrer på `nb-NO`). Chirp 3 HD-stemmene (`nb-NO-Chirp3-HD-*`) er de mest naturlige. Wavenet- og Standard-stemmene er billigere.

## Lesehastighet

- **Læreren** velger lesehastighet (Normal, Litt saktere, Sakte) før oppgaven genereres. Det sendes som `speakingRate` til Google (1.0, 0.85 og 0.7), så selve lydfilen blir saktere.
- **Eleven** kan i tillegg sette ned avspillingsfarten i lydspilleren. Det virker også på lytteøvinger som ble laget med ElevenLabs.
