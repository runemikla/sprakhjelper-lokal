// Core of the language model ("språkmodell") setup: how a request is sent to
// an Azure AI Foundry deployment and adapted to the model. lib/ai/azure.ts
// adds the model an admin has chosen on the "Språkmodell" page; the routes use
// that file. See docs/BYTTE_SPRAKMODELL.md for the guide.
//
// Environment variables:
//   AZURE_OPENAI_ENDPOINT          https://<ressurs>.openai.azure.com (or .services.ai.azure.com)
//   AZURE_OPENAI_API_KEY           key for the Azure AI Foundry resource
//   AZURE_OPENAI_DEPLOYMENT_NAME   deployment used when no model is chosen in
//                                  admin (default gpt-4o)
//   AZURE_OPENAI_API_VERSION       e.g. 2024-08-01-preview, or "v1" for the
//                                  Foundry v1 API (needed for non-OpenAI models)
//   AZURE_OPENAI_MODEL_TYPE        "standard" or "reasoning" (optional, guessed
//                                  from the deployment name when unset)
//   AZURE_OPENAI_REASONING_EFFORT  minimal | low | medium | high (reasoning
//                                  models only, default low)
//
// This file has no imports so scripts/sjekk-modell.mjs can load it directly
// with Node.

export type ModelType = 'standard' | 'reasoning';

export const MODEL_TYPES: ModelType[] = ['standard', 'reasoning'];
export const REASONING_EFFORTS = ['minimal', 'low', 'medium', 'high'] as const;

// What can differ between models. The endpoint and key are shared.
export interface ModelSettings {
  deployment: string;
  apiVersion: string;
  modelType: ModelType;
  reasoningEffort: string;
}

export interface AzureModelConfig extends ModelSettings {
  endpoint: string;
  apiKey: string;
}

export interface ChatCompletionBody {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_completion_tokens?: number;
  response_format?: unknown;
}

// Reasoning models spend part of max_completion_tokens on hidden reasoning
// before they write the answer, so they get this much extra room.
const REASONING_TOKEN_HEADROOM = 4000;

// o1, o3, o4-mini and gpt-5 and newer (gpt-5.4, gpt-6.1-terra ...) are
// reasoning models. Chat variants such as gpt-5-chat are not.
export function guessModelType(deployment: string): ModelType {
  const name = deployment.toLowerCase();
  if (name.includes('chat')) return 'standard';
  return /^(o\d|gpt-([5-9]|\d{2,}))/.test(name) ? 'reasoning' : 'standard';
}

// The model from the environment variables, used when no model is chosen in
// admin.
export function getEnvModelConfig(): AzureModelConfig {
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
  const modelTypeEnv = process.env.AZURE_OPENAI_MODEL_TYPE?.trim().toLowerCase();
  return {
    endpoint: (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, ''),
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    deployment,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
    modelType:
      modelTypeEnv === 'reasoning' || modelTypeEnv === 'standard'
        ? modelTypeEnv
        : guessModelType(deployment),
    reasoningEffort: process.env.AZURE_OPENAI_REASONING_EFFORT || 'low',
  };
}

/**
 * Send a chat completion request to an Azure AI Foundry deployment. Routes
 * describe what they want (temperature, token budget, JSON schema) and this
 * function adapts the request to the model: reasoning models get no
 * temperature, more tokens and a reasoning effort, and the v1 API gets the
 * deployment name in the body instead of the URL.
 */
export async function sendChatCompletion(
  config: AzureModelConfig,
  body: ChatCompletionBody
): Promise<Response> {
  if (!config.endpoint || !config.apiKey) {
    throw new Error(
      'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env'
    );
  }

  const requestBody: Record<string, unknown> = { ...body };

  if (config.modelType === 'reasoning') {
    delete requestBody.temperature;
    if (typeof body.max_completion_tokens === 'number') {
      requestBody.max_completion_tokens = body.max_completion_tokens + REASONING_TOKEN_HEADROOM;
    }
    requestBody.reasoning_effort = config.reasoningEffort;
  }

  let url: string;
  if (config.apiVersion === 'v1') {
    url = `${config.endpoint}/openai/v1/chat/completions`;
    requestBody.model = config.deployment;
  } else {
    url = `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;
  }

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(requestBody),
  });
}

// ---------------------------------------------------------------------------
// Model check: the same kinds of requests the app sends. Used by the "Test"
// button on the admin page and by scripts/sjekk-modell.mjs.
// ---------------------------------------------------------------------------

export interface ModelCheckResult {
  name: string;
  ok: boolean;
  seconds: number;
  detail: string;
}

const MODEL_CHECKS: {
  name: string;
  body: ChatCompletionBody;
  check: (text: string) => boolean;
}[] = [
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

export async function runModelChecks(config: AzureModelConfig): Promise<ModelCheckResult[]> {
  const results: ModelCheckResult[] = [];
  for (const test of MODEL_CHECKS) {
    const started = Date.now();
    const seconds = () => Math.round((Date.now() - started) / 100) / 10;
    try {
      const response = await sendChatCompletion(config, test.body);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 500)}`);
      }
      const data = await response.json();
      const text: string = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) {
        throw new Error(
          `Tomt svar (finish_reason: ${data.choices?.[0]?.finish_reason}). ` +
            'For reasoning-modeller betyr det ofte at token-grensen ble brukt opp.'
        );
      }
      if (!test.check(text)) throw new Error(`Uventet svar: ${text.slice(0, 300)}`);
      const tokens = data.usage ? ` (${data.usage.total_tokens} tokens)` : '';
      results.push({
        name: test.name,
        ok: true,
        seconds: seconds(),
        detail: text.slice(0, 200).replace(/\n/g, ' ') + tokens,
      });
    } catch (error) {
      const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : '';
      results.push({
        name: test.name,
        ok: false,
        seconds: seconds(),
        detail: (error instanceof Error ? error.message : String(error)) + cause,
      });
    }
  }
  return results;
}
