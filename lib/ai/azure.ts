// Single place for the language model ("språkmodell") configuration. Every AI
// route calls azureChatCompletion() instead of building its own Azure URL, so
// switching model is a matter of changing environment variables in Coolify.
// See docs/BYTTE_SPRAKMODELL.md for the step-by-step guide.
//
// Environment variables:
//   AZURE_OPENAI_ENDPOINT          https://<ressurs>.openai.azure.com (or .services.ai.azure.com)
//   AZURE_OPENAI_API_KEY           key for the Azure AI Foundry resource
//   AZURE_OPENAI_DEPLOYMENT_NAME   deployment name in Azure AI Foundry (default gpt-4o)
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

export interface AzureModelConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
  modelType: ModelType;
  reasoningEffort: string;
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

// o1, o3, o4-mini, gpt-5, gpt-5-mini ... are reasoning models. gpt-5-chat is not.
function guessModelType(deployment: string): ModelType {
  const name = deployment.toLowerCase();
  if (name.includes('chat')) return 'standard';
  return /^(o\d|gpt-5)/.test(name) ? 'reasoning' : 'standard';
}

export function getAzureModelConfig(): AzureModelConfig {
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

export function isAzureConfigured(): boolean {
  const { endpoint, apiKey } = getAzureModelConfig();
  return Boolean(endpoint && apiKey);
}

/**
 * Send a chat completion request to the configured Azure AI Foundry
 * deployment. Routes describe what they want (temperature, token budget,
 * JSON schema) and this function adapts the request to the model: reasoning
 * models get no temperature, more tokens and a reasoning effort, and the v1
 * API gets the deployment name in the body instead of the URL.
 */
export async function azureChatCompletion(body: ChatCompletionBody): Promise<Response> {
  const config = getAzureModelConfig();
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
    url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;
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
