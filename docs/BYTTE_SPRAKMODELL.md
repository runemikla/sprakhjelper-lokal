# Bytte språkmodell

Alle KI-verktøyene i Språkhjelp (skrivehjelp, setningsdeling, oppsummering, setningsgenerator, lytteøvelser og retting av lytteøvelser) bruker samme språkmodell. Du trenger ikke endre kode for å bytte modell.

Det er to måter å velge modell på:

1. **Admin-siden Språkmodell** (`/sprakmodell`, i KI-verktøy-menyen for administratorer). Her legger du til en deployment, tester den og tar den i bruk med ett klikk. Dette er den enkleste måten.
2. **Miljøvariablene i Coolify.** Modellen herfra er «standardmodellen». Den brukes når ingen modell er valgt på admin-siden, og som reserve hvis databasen ikke svarer.

Koden som snakker med Azure ligger i `lib/ai/azure-core.ts` (selve forespørselen) og `lib/ai/azure.ts` (velger modellen fra admin-siden eller miljøvariablene).

## Bytte modell fra admin-siden

1. Lag deploymenten i Azure AI Foundry (se steg 1 under) hvis den ikke finnes.
2. Gå til **Språkmodell** i menyen og trykk **Legg til modell**.
3. Skriv eller velg deployment-navnet. Modelltypen foreslås ut fra navnet (gpt-5 og nyere er reasoning). La API-versjonen stå på `v1`.
4. Trykk **Test**. Den sender de samme forespørslene som verktøyene og viser om de virker og hvor lang tid de tar.
5. Trykk **Lagre og ta i bruk**. Alle verktøyene bruker den nye modellen innen 30 sekunder.
6. Prøv verktøyene på nettsiden. Er du ikke fornøyd, trykker du **Bruk denne** på en annen modell eller på «Standard fra Coolify».

Siden testappen og produksjonsappen bruker samme database, gjelder valget på admin-siden **begge** stedene samtidig. Vil du teste en modell bare på test.sprakhjelp.no, bruk miljøvariablene på testappen i stedet (se under), mens admin-siden står på «Standard fra Coolify».

Deploymentene må ligge i samme Azure-ressurs som `AZURE_OPENAI_ENDPOINT`, siden nøkkelen bare finnes i miljøvariablene.

Admin-siden krever at migrasjonen `supabase/migrations/20261028100000_create_ai_models.sql` er kjørt. Før det viser siden en gul melding og verktøyene bruker miljøvariablene.

## Miljøvariablene

| Variabel | Hva den er | Eksempel |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | Adressen til Azure AI Foundry-ressursen | `https://minressurs.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Nøkkelen til ressursen | (hemmelig) |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Navnet du ga deploymenten i Foundry. Standardmodellen, brukt når ingen modell er valgt på admin-siden. | `gpt-4o`, `gpt-4.1`, `gpt-5-mini` |
| `AZURE_OPENAI_API_VERSION` | API-versjon. Bruk `v1` for nye modeller og for modeller som ikke er fra OpenAI. | `2024-08-01-preview`, `2025-04-01-preview`, `v1` |
| `AZURE_OPENAI_MODEL_TYPE` | Valgfri. `standard` eller `reasoning`. Står den tom, gjetter appen ut fra deployment-navnet. | `reasoning` |
| `AZURE_OPENAI_REASONING_EFFORT` | Valgfri, bare for reasoning-modeller. `minimal`, `low`, `medium` eller `high`. Standard er `low`. | `low` |

### Standard- og reasoning-modeller

Reasoning-modeller (o1, o3, o4-mini og gpt-5 og nyere) tenker før de svarer. De godtar ikke `temperature`, og de bruker en del av token-grensen på tenkingen. Når modelltypen er `reasoning`, gjør appen dette automatisk:

- fjerner `temperature` fra forespørselen,
- gir 4000 ekstra tokens så svaret ikke blir kuttet,
- sender `reasoning_effort` (standard `low`, så elevene ikke må vente lenge).

Appen gjetter `reasoning` når deployment-navnet starter med `o1`, `o3`, `o4` eller `gpt-5` og nyere (`gpt-5.4`, `gpt-6.1-terra` osv.), men ikke når navnet inneholder `chat`, som `gpt-5-chat`. Har du gitt deploymenten et annet navn, for eksempel `sprakhjelp-modell`, må du sette `AZURE_OPENAI_MODEL_TYPE` selv.

Reasoning-modeller med `low` er tregere enn gpt-4o. Test at ventetiden er grei for elevene før du bytter i produksjon.

## Steg for steg med miljøvariablene i Coolify

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
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.4 AZURE_OPENAI_API_VERSION=v1 pnpm sjekk-modell
```

Skriptet gjør det samme som «Test»-knappen på admin-siden. Det sender en vanlig tekstforespørsel og en med JSON-skjema, akkurat som appen gjør, og sier om begge gikk bra og hvor lang tid de tok. Ikke gå videre før alle tester er OK.

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

På admin-siden: trykk **Bruk denne** på forrige modell eller på «Standard fra Coolify». Med miljøvariablene: sett `AZURE_OPENAI_DEPLOYMENT_NAME` (og eventuelt de andre variablene) tilbake til de gamle verdiene i Coolify og redeploy. Derfor er det lurt å beholde den gamle deploymenten i Foundry en stund.

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
