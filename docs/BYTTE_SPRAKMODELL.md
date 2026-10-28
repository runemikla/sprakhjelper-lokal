# Bytte språkmodell

Alle KI-verktøyene i Språkhjelp (skrivehjelp, setningsdeling, oppsummering, setningsgenerator, lytteøvelser og retting av lytteøvelser) bruker samme språkmodell. Modellen velges bare med miljøvariabler, og all kode som snakker med Azure ligger i `lib/ai/azure.ts`. Du trenger altså ikke endre kode for å bytte modell.

## Miljøvariablene

| Variabel | Hva den er | Eksempel |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | Adressen til Azure AI Foundry-ressursen | `https://minressurs.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Nøkkelen til ressursen | (hemmelig) |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Navnet du ga deploymenten i Foundry. Dette er variabelen du endrer når du bytter modell. | `gpt-4o`, `gpt-4.1`, `gpt-5-mini` |
| `AZURE_OPENAI_API_VERSION` | API-versjon. Bruk `v1` for nye modeller og for modeller som ikke er fra OpenAI. | `2024-08-01-preview`, `2025-04-01-preview`, `v1` |
| `AZURE_OPENAI_MODEL_TYPE` | Valgfri. `standard` eller `reasoning`. Står den tom, gjetter appen ut fra deployment-navnet. | `reasoning` |
| `AZURE_OPENAI_REASONING_EFFORT` | Valgfri, bare for reasoning-modeller. `minimal`, `low`, `medium` eller `high`. Standard er `low`. | `low` |

### Standard- og reasoning-modeller

Reasoning-modeller (o1, o3, o4-mini, gpt-5, gpt-5-mini, gpt-5-nano) tenker før de svarer. De godtar ikke `temperature`, og de bruker en del av token-grensen på tenkingen. Når modelltypen er `reasoning`, gjør appen dette automatisk:

- fjerner `temperature` fra forespørselen,
- gir 4000 ekstra tokens så svaret ikke blir kuttet,
- sender `reasoning_effort` (standard `low`, så elevene ikke må vente lenge).

Appen gjetter `reasoning` når deployment-navnet starter med `o1`, `o3`, `o4` eller `gpt-5` (men ikke når navnet inneholder `chat`, som `gpt-5-chat`). Har du gitt deploymenten et annet navn, for eksempel `sprakhjelp-modell`, må du sette `AZURE_OPENAI_MODEL_TYPE` selv.

Reasoning-modeller med `low` er tregere enn gpt-4o. Test at ventetiden er grei for elevene før du bytter i produksjon.

## Steg for steg

### 1. Lag en ny deployment i Azure AI Foundry

1. Gå til [ai.azure.com](https://ai.azure.com) og åpne prosjektet/ressursen appen bruker (samme som `AZURE_OPENAI_ENDPOINT`).
2. Velg **Models + endpoints** (eller **Deployments**) og **Deploy model** → **Deploy base model**.
3. Velg modellen. Sjekk at den støtter **structured outputs / JSON schema**, siden nesten alle verktøyene i appen krever det. Alle OpenAI-modeller fra gpt-4o og nyere gjør det.
4. Velg deployment-type. **Data Zone Standard (EU)** holder dataene i EU, noe som er viktig for elevdata. **Global Standard** kan behandle data utenfor EU.
5. Gi deploymenten et navn. Det enkleste er å bruke modellnavnet (f.eks. `gpt-5-mini`), da gjetter appen modelltypen riktig.
6. Sett **Tokens per minute** høyt nok. Gamle deploymenten viser hvor mye som brukes i dag.
7. Behold den gamle deploymenten til den nye har gått bra i produksjon en stund. Da kan du bytte tilbake på et minutt.

Bruker du en modell som ikke er fra OpenAI (Mistral, Llama, DeepSeek, Grok osv.), sett `AZURE_OPENAI_API_VERSION=v1`. Sjekk med testskriptet under at JSON-skjema fungerer, for mange slike modeller støtter det ikke fullt ut.

### 2. Test modellen lokalt

Med den nye deploymenten i `.env.local` (eller bare som variabel på kommandolinjen):

```bash
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini pnpm sjekk-modell
```

Skriptet sender en vanlig tekstforespørsel og en med JSON-skjema, akkurat som appen gjør, og sier om begge gikk bra og hvor lang tid de tok. Ikke gå videre før alle tester er OK.

### 3. Bytt på testappen i Coolify

1. Åpne testappen (test.sprakhjelp.no) i Coolify → **Environment Variables**.
2. Endre `AZURE_OPENAI_DEPLOYMENT_NAME` (og `AZURE_OPENAI_API_VERSION` / `AZURE_OPENAI_MODEL_TYPE` om nødvendig).
3. Lagre og trykk **Redeploy** (eller **Restart**) så appen leser de nye verdiene.
4. Test alle verktøyene på test.sprakhjelp.no: skrivehjelp, oppsummering, setningsgenerator, lag lytteøvelse og rett lytteøvelse. Se særlig på kvaliteten på forklaringene og hvor lang tid det tar.

Hvis testappen og produksjonsappen deler miljøvariabler (f.eks. via delte variabler på prosjektnivå i Coolify), endrer du begge samtidig. Overstyr i så fall variabelen bare på testappen mens du tester.

### 4. Bytt i produksjon

1. Gjør den samme endringen på produksjonsappen (sprakhjelp.no) i Coolify.
2. Redeploy/restart.
3. Gjør en rask test på sprakhjelp.no.

Endring av modell krever ingen ny kode i main, bare at denne koden (`lib/ai/azure.ts`) allerede er publisert til produksjon. Før den var det, krasjet reasoning-modeller i produksjon fordi appen sendte `temperature: 0`.

### 5. Bytte tilbake

Sett `AZURE_OPENAI_DEPLOYMENT_NAME` (og eventuelt de andre variablene) tilbake til de gamle verdiene i Coolify og redeploy. Derfor er det lurt å beholde den gamle deploymenten i Foundry en stund.

## Feilsøking

| Feil | Årsak og løsning |
|---|---|
| `404 DeploymentNotFound` | Deployment-navnet stemmer ikke med Foundry, eller den ligger i en annen ressurs enn `AZURE_OPENAI_ENDPOINT`. |
| `400 Unsupported parameter: 'temperature'` | Det er en reasoning-modell som appen tror er en standardmodell. Sett `AZURE_OPENAI_MODEL_TYPE=reasoning`. |
| `400 ... response_format` / `json_schema` | API-versjonen er for gammel, eller modellen støtter ikke JSON-skjema. Prøv `AZURE_OPENAI_API_VERSION=2025-04-01-preview` eller `v1`. |
| `400 ... reasoning_effort` | API-versjonen er for gammel for reasoning-modeller. Bruk `2025-04-01-preview` eller `v1`. |
| Tomt svar (`finish_reason: length`) | Reasoning-modellen brukte opp tokens på tenking. Sett `AZURE_OPENAI_REASONING_EFFORT=minimal` eller `low`. |
| `429 Too Many Requests` | Øk **Tokens per minute** på deploymenten i Foundry. |
| `401` | Feil `AZURE_OPENAI_API_KEY`, eller nøkkelen hører til en annen ressurs. |
