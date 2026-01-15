# Språkhjelperen

En norsk språklæringsassistent som hjelper brukere med å forbedre sitt norske skriftspråk.

## Forutsetninger

- Node.js (versjon 18 eller nyere)
- pnpm (anbefalt pakkebehandler)
- Azure OpenAI API-tilgang

## Installasjon

1. Klon repositoriet:
```bash
git clone <repository-url>
cd sprakhjelperen-lokal
```

2. Installer avhengigheter:
```bash
pnpm install
```

3. Konfigurer miljøvariabler:
Opprett en `.env.local`-fil i rotmappen med følgende variabler:

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

4. Start utviklingsserveren:
```bash
pnpm dev
```

Applikasjonen vil være tilgjengelig på [http://localhost:3000](http://localhost:3000).

## Bygging for produksjon

```bash
pnpm build
pnpm start
```

## Prosjektstruktur

```
sprakhjelperen-lokal/
├── app/                    # Next.js App Router sider
│   ├── spraakhjelper/     # Hovedapplikasjon
│   ├── api/               # API-ruter
│   └── layout.tsx         # Rotlayout
├── components/            # React-komponenter
│   ├── ui/               # UI-komponenter (shadcn/ui)
│   └── landing/          # Landingside-komponenter
├── lib/                  # Hjelpefunksjoner og utilities
└── public/              # Statiske filer
```

## Teknologier

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **UI-komponenter**: Radix UI + shadcn/ui
- **AI**: Azure OpenAI
- **Språk**: TypeScript
- **Pakkebehandler**: pnpm

## Feilsøking

### "Module not found" feil ved oppstart

Hvis du får feilmeldinger om at moduler som `next-themes`, `sonner`, eller `lucide-react` ikke kan finnes, selv om de er installert:

1. Stopp utviklingsserveren (Ctrl+C)
2. Slett Next.js cache:
```bash
rm -rf .next
```
3. Start serveren på nytt:
```bash
pnpm dev
```

Dette problemet oppstår vanligvis når Next.js sin cache ikke oppdateres etter at nye pakker er installert.

### Pakker mangler

Hvis du får feilmeldinger om manglende pakker, installer dem med:
```bash
pnpm install
```

Eller installer spesifikke pakker:
```bash
pnpm add <pakkenavn>
```

### TypeScript-feil

Kjør type-sjekk:
```bash
pnpm tsc --noEmit
```

### Linting-feil

Kjør linter:
```bash
pnpm lint
```

## Utvikling

### Kodestil

Prosjektet følger disse retningslinjene:
- Bruk TypeScript for all kode
- Bruk funksjonelle komponenter med hooks
- Følg Next.js App Router beste praksis
- Bruk Server Components der det er mulig

### Komponentstruktur

- Plasser komponenter i `components/` mappen
- Grupper relaterte komponenter i undermapper
- Bruk `components/ui/` for gjenbrukbare UI-komponenter
- Følg shadcn/ui-konvensjoner for UI-komponenter

## Sikkerhet

- Aldri commit `.env.local` eller andre filer med hemmeligheter
- Bruk miljøvariabler for alle API-nøkler
- Valider all brukerinput med Zod
- Implementer rate limiting for API-endepunkter

## Lisens

Dette prosjektet er lisensiert under MIT-lisensen - se [LICENSE](LICENSE) filen for detaljer.

## Bidrag

Bidrag er velkomne! Vennligst følg disse retningslinjene:

1. Fork repositoriet
2. Opprett en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit endringene dine (`git commit -m 'Add some AmazingFeature'`)
4. Push til branchen (`git push origin feature/AmazingFeature`)
5. Åpne en Pull Request

Sørg for at koden din:
- Følger prosjektets kodestil
- Passerer alle linting-sjekker (`pnpm lint`)
- Inkluderer passende dokumentasjon

