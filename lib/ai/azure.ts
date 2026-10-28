import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'
import {
  getEnvModelConfig,
  sendChatCompletion,
  type AzureModelConfig,
  type ChatCompletionBody,
  type ModelSettings,
} from '@/lib/ai/azure-core'

// The language model every AI route uses: the model an admin has chosen on
// the "Språkmodell" page (table ai_models in Supabase), or the model from the
// AZURE_OPENAI_* environment variables when none is chosen or the lookup
// fails. Routes call azureChatCompletion() and never build Azure URLs
// themselves. See docs/BYTTE_SPRAKMODELL.md.

// Short in-memory cache so every AI request does not hit the database. A
// change on the admin page clears it right away in this process.
const CACHE_TTL_MS = 30_000

let cache: { settings: ModelSettings | null; expiresAt: number } | null = null

export function clearModelCache() {
  cache = null
}

// The tools are used by students who are not logged in, so this uses a plain
// anon client (no cookies) and the get_active_ai_model() database function.
async function fetchActiveModel(): Promise<ModelSettings | null> {
  const { url, key } = getSupabaseEnv()
  const supabase = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('get_active_ai_model')
  if (error) throw error
  if (!data) return null

  const row = data as {
    deployment: string
    api_version: string
    model_type: 'standard' | 'reasoning'
    reasoning_effort: string
  }
  return {
    deployment: row.deployment,
    apiVersion: row.api_version,
    modelType: row.model_type,
    reasoningEffort: row.reasoning_effort,
  }
}

async function getActiveModel(): Promise<ModelSettings | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.settings

  try {
    const settings = await fetchActiveModel()
    cache = { settings, expiresAt: Date.now() + CACHE_TTL_MS }
    return settings
  } catch (error) {
    // Never break a tool because of the lookup: fall back to the environment
    // variables and try the database again on the next request.
    console.error(
      'Could not load active AI model, using environment variables:',
      error instanceof Error ? error.message : error
    )
    return null
  }
}

// The model the tools use right now, with the endpoint and key from the
// environment.
export async function getActiveModelConfig(): Promise<AzureModelConfig> {
  const envConfig = getEnvModelConfig()
  const active = await getActiveModel()
  return active ? { ...envConfig, ...active } : envConfig
}

export function isAzureConfigured(): boolean {
  const { endpoint, apiKey } = getEnvModelConfig()
  return Boolean(endpoint && apiKey)
}

export async function azureChatCompletion(body: ChatCompletionBody): Promise<Response> {
  return sendChatCompletion(await getActiveModelConfig(), body)
}
