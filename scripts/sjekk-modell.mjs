// Tester at språkmodellen i Azure AI Foundry fungerer med appen før du bytter.
// Sender de samme typene forespørsler som appen gjør (fritekst og JSON-skjema)
// og skriver ut om de lykkes.
//
// Bruk (Node 22.18 eller nyere):
//   node --env-file=.env.local scripts/sjekk-modell.mjs
// Test en annen deployment uten å endre filen:
//   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini node --env-file=.env.local scripts/sjekk-modell.mjs
//
// Se docs/BYTTE_SPRAKMODELL.md.

import { azureChatCompletion, getAzureModelConfig } from '../lib/ai/azure.ts';

const config = getAzureModelConfig();
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

const tests = [
  {
    name: 'Fritekst (som setningsdeling)',
    body: {
      messages: [{ role: 'user', content: 'Svar med ett ord på norsk: Hva heter hovedstaden i Norge?' }],
      temperature: 0,
      max_completion_tokens: 200,
    },
    check: (text) => text.length > 0,
  },
  {
    name: 'JSON-skjema (som skrivehjelp, oppsummering og lytteøvelser)',
    body: {
      messages: [
        { role: 'system', content: 'Du retter norske setninger.' },
        { role: 'user', content: 'Rett denne setningen: «Jeg liker ikke å spise fisk ikke.»' },
      ],
      temperature: 0,
      max_completion_tokens: 500,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sjekk',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              corrected: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['corrected', 'explanation'],
            additionalProperties: false,
          },
        },
      },
    },
    check: (text) => {
      const parsed = JSON.parse(text);
      return typeof parsed.corrected === 'string' && typeof parsed.explanation === 'string';
    },
  },
];

let failed = 0;
for (const test of tests) {
  const started = Date.now();
  try {
    const response = await azureChatCompletion(test.body);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 500)}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) {
      throw new Error(
        `Tomt svar (finish_reason: ${data.choices?.[0]?.finish_reason}). ` +
          'For reasoning-modeller betyr det ofte at token-grensen ble brukt opp.'
      );
    }
    if (!test.check(text)) throw new Error(`Uventet svar: ${text.slice(0, 300)}`);
    const tokens = data.usage ? `, ${data.usage.total_tokens} tokens` : '';
    console.log(`OK    ${test.name} (${seconds} s${tokens})`);
    console.log(`      ${text.slice(0, 200).replace(/\n/g, ' ')}`);
  } catch (error) {
    failed++;
    console.log(`FEIL  ${test.name}`);
    console.log(`      ${error instanceof Error ? error.message : error}`);
  }
}

console.log('');
if (failed) {
  console.log(`${failed} av ${tests.length} tester feilet. Ikke bytt til denne modellen ennå.`);
  process.exit(1);
}
console.log('Alle tester OK. Modellen kan brukes av appen.');
