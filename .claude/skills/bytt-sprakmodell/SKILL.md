---
name: bytt-sprakmodell
description: Hjelper Rune å bytte språkmodell (Azure AI Foundry-deployment) i Språkhjelp. Bruk når noen vil bytte, teste, sammenligne eller rulle tilbake KI-modellen appen bruker.
---

# Bytt språkmodell i Språkhjelp

Du hjelper Rune å bytte modellen som alle KI-verktøyene i Språkhjelp bruker. Svar på norsk, enkelt og konkret. Les `docs/BYTTE_SPRAKMODELL.md` først; den er fasiten for stegene og feilsøkingen.

## Slik er det satt opp

- All kontakt med modellen går gjennom `azureChatCompletion()` i `lib/ai/azure.ts`. Ingen route skal bygge Azure-URL selv. Finner du en som gjør det, flytt den over til `azureChatCompletion()`.
- Modellen velges bare med miljøvariabler: `AZURE_OPENAI_DEPLOYMENT_NAME`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_MODEL_TYPE` og `AZURE_OPENAI_REASONING_EFFORT` (pluss `AZURE_OPENAI_ENDPOINT` og `AZURE_OPENAI_API_KEY`).
- Appen kjører i Coolify på Hetzner. Testappen (test.sprakhjelp.no) bygger fra `dev`, produksjon (sprakhjelp.no) fra `main`. Du har ikke tilgang til Coolify eller Azure; Rune gjør endringene der, og du forteller nøyaktig hva han skal skrive inn.

## Fremgangsmåte

1. **Finn ut hva Rune vil.** Hvilken modell, og hvorfor (kvalitet, pris, fart, en modell som skal fases ut)? Spør bare om det som mangler.
2. **Sjekk modellen.** Søk på nettet etter om modellen er tilgjengelig i Azure AI Foundry, i hvilke regioner og deployment-typer (helst Data Zone Standard EU, siden det er elevdata), om den støtter structured outputs / JSON schema, om den er en reasoning-modell, og hvilken API-versjon den krever. Si fra tydelig hvis noe av dette gjør modellen uegnet.
3. **Lag verdiene.** Skriv ut nøyaktig hvilke miljøvariabler som skal endres, med verdier, i en kodeblokk. Sett `AZURE_OPENAI_MODEL_TYPE` eksplisitt hvis deployment-navnet ikke starter med modellnavnet.
4. **Guide Foundry-steget.** Gå gjennom steg 1 i guiden for akkurat denne modellen (deployment-type, navn, tokens per minute). Minn Rune på å beholde den gamle deploymenten.
5. **Test.** Be Rune kjøre `AZURE_OPENAI_DEPLOYMENT_NAME=<navn> pnpm sjekk-modell` lokalt (eller kjør det selv hvis nøkkelen finnes i miljøet ditt). Tolk resultatet med feilsøkingstabellen i guiden. Ikke anbefal å gå videre før alle tester er OK.
6. **Testappen først.** Gi Coolify-stegene for testappen og en kort testliste: skrivehjelp, oppsummering, setningsgenerator, lag lytteøvelse og rett lytteøvelse. Be Rune se etter kvalitet på forklaringene og ventetid.
7. **Produksjon.** Først når Rune sier testen gikk bra: gi stegene for produksjonsappen og hvordan han ruller tilbake.
8. **Oppdater dokumentasjon.** Hvis byttet avslørte noe nytt (en ny feil, en modell som trenger spesiell behandling), oppdater `docs/BYTTE_SPRAKMODELL.md`. Hvis koden må endres (f.eks. ny parameter en modell krever), gjør det i `lib/ai/azure.ts`, ikke i hver route.

## Regler

- Kodeendringer går på en egen branch fra `dev`, med PR mot `dev`. Aldri mot `main`.
- Aldri skriv API-nøkler i kode, i commits eller i chat.
- Ikke be Rune endre produksjon før testappen er testet og han har sagt ja.
- Endringer i Supabase-databasen («Hallaien») krever eksplisitt ja fra Rune. Et modellbytte skal normalt ikke røre databasen.
- Hvis koden for `lib/ai/azure.ts` ikke er publisert til `main` ennå, si fra: da kan produksjon bare bruke standardmodeller (ikke reasoning-modeller).
