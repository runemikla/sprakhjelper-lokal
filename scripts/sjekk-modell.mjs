// Tester at en språkmodell i Azure AI Foundry fungerer med appen. Sender de
// samme typene forespørsler som appen gjør (fritekst og JSON-skjema) og
// skriver ut om de lykkes. Samme test som «Test»-knappen på admin-siden
// Språkmodell.
//
// Bruk (Node 22.18 eller nyere):
//   pnpm sjekk-modell
// Test en annen deployment uten å endre .env.local:
//   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.4 AZURE_OPENAI_API_VERSION=v1 pnpm sjekk-modell
//
// Se docs/BYTTE_SPRAKMODELL.md.

import { getEnvModelConfig, runModelChecks } from '../lib/ai/azure-core.ts';

const config = getEnvModelConfig();
console.log('Endepunkt:   ', config.endpoint || '(mangler AZURE_OPENAI_ENDPOINT)');
console.log('Deployment:  ', config.deployment);
console.log('API-versjon: ', config.apiVersion);
console.log('Modelltype:  ', config.modelType + (process.env.AZURE_OPENAI_MODEL_TYPE ? '' : ' (gjettet fra navnet)'));
if (config.modelType === 'reasoning') console.log('Reasoning effort:', config.reasoningEffort);
console.log('');

if (!config.endpoint || !config.apiKey) {
  console.error('Mangler AZURE_OPENAI_ENDPOINT eller AZURE_OPENAI_API_KEY.');
  process.exit(1);
}

const results = await runModelChecks(config);
for (const result of results) {
  console.log(`${result.ok ? 'OK  ' : 'FEIL'}  ${result.name} (${result.seconds} s)`);
  console.log(`      ${result.detail}`);
}

const failed = results.filter((result) => !result.ok).length;
console.log('');
if (failed) {
  console.log(`${failed} av ${results.length} tester feilet. Ikke bytt til denne modellen ennå.`);
  process.exit(1);
}
console.log('Alle tester OK. Modellen kan brukes av appen.');
