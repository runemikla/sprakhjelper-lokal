import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'

// Logs each AI call (tokens in/out, tool, model) to the table ai_usage, shown
// on /admin/forbruk. Only numbers and labels are stored, never the text the
// student wrote. Logging never breaks a tool: errors are written to the
// server log and ignored. Until the migration is applied nothing is logged.

// Every place that calls a model. The key is stored in the database; the
// label and the tool group are what the admin page shows.
export const USAGE_TOOLS = {
  'skrivehjelp-analyse': { label: 'Skrivehjelp: analyse', group: 'Skrivehjelp' },
  'skrivehjelp-setningsdeling': { label: 'Skrivehjelp: setningsdeling', group: 'Skrivehjelp' },
  'skrivehjelp-setningssjekk': { label: 'Skrivehjelp: setningssjekk', group: 'Skrivehjelp' },
  'skrivehjelp-sammendrag': { label: 'Skrivehjelp: sammendrag', group: 'Skrivehjelp' },
  'grammatikk-ovinger': { label: 'Grammatikk: øv på feilene', group: 'Grammatikkøving' },
  'grammatikk-ordrekkefolge': { label: 'Grammatikk: ordrekkefølge', group: 'Grammatikkøving' },
  'lytteoving-sporsmal': { label: 'Lytteøving: lag spørsmål', group: 'Lytteøving' },
  'lytteoving-lyd': { label: 'Lytteøving: opplesing', group: 'Lytteøving' },
  'lytteoving-vurdering': { label: 'Lytteøving: vurder svar', group: 'Lytteøving' },
  'laer-ord-innhold': { label: 'Lær ord: bøyning og eksempler', group: 'Lær ord' },
  'laer-ord-lyd': { label: 'Lær ord: opplesing', group: 'Lær ord' },
  'laer-ord-bilde': { label: 'Lær ord: bilder', group: 'Lær ord' },
  'snakkebot-svar': { label: 'Snakkebot: svar', group: 'Snakkebot' },
  'snakkebot-lyd': { label: 'Snakkebot: opplesing', group: 'Snakkebot' },
  'snakkebot-tale': { label: 'Snakkebot: tale til tekst', group: 'Snakkebot' },
} as const

export type UsageTool = keyof typeof USAGE_TOOLS
export type UsageKind = 'tekst' | 'bilde' | 'lyd' | 'tale'

export interface UsageEntry {
  tool: UsageTool
  provider: 'azure' | 'gemini' | 'google' | 'elevenlabs'
  model: string
  kind?: UsageKind
  inputTokens?: number
  cachedTokens?: number
  outputTokens?: number
  // Pictures (bilde), characters read aloud (lyd) or seconds of speech (tale).
  units?: number
  ok?: boolean
}

let client: SupabaseClient | null = null

// Students are not signed in, so this uses a plain anon client and the
// log_ai_usage() database function.
function usageClient(): SupabaseClient {
  if (!client) {
    const { url, key } = getSupabaseEnv()
    client = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

const int = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0)

/** Logs one AI call. Never throws and does not need to be awaited. */
export async function logAiUsage(entry: UsageEntry): Promise<void> {
  try {
    const { error } = await usageClient().rpc('log_ai_usage', {
      p_tool: entry.tool,
      p_provider: entry.provider,
      p_model: (entry.model || 'ukjent').slice(0, 80),
      p_kind: entry.kind ?? 'tekst',
      p_input_tokens: int(entry.inputTokens),
      p_cached_tokens: int(entry.cachedTokens),
      p_output_tokens: int(entry.outputTokens),
      p_units: int(entry.units),
      p_ok: entry.ok ?? true,
    })
    if (error) console.warn('ai_usage: kunne ikke logge:', error.message)
  } catch (error) {
    console.warn('ai_usage: kunne ikke logge:', error instanceof Error ? error.message : error)
  }
}

// The usage block in an OpenAI-style chat completion (Azure).
export interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number }
}

export function logChatUsage(tool: UsageTool, model: string, usage: ChatUsage | undefined, ok = true) {
  void logAiUsage({
    tool,
    provider: 'azure',
    model,
    inputTokens: usage?.prompt_tokens,
    cachedTokens: usage?.prompt_tokens_details?.cached_tokens,
    outputTokens: usage?.completion_tokens,
    ok,
  })
}

/**
 * Logs the tokens of a chat completion response without consuming it: the
 * route still reads the original response. Failed calls are logged as not
 * ok, with no tokens.
 */
export function logChatResponse(tool: UsageTool, model: string, response: Response) {
  if (!response.ok) {
    logChatUsage(tool, model, undefined, false)
    return
  }
  response
    .clone()
    .json()
    .then((data: { usage?: ChatUsage }) => logChatUsage(tool, model, data?.usage))
    .catch(() => logChatUsage(tool, model, undefined))
}

// Gemini reports tokens as usageMetadata.
export interface GeminiUsage {
  promptTokenCount?: number
  cachedContentTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
}

export function logGeminiUsage(
  tool: UsageTool,
  model: string,
  usage: GeminiUsage | undefined,
  extra: { kind?: UsageKind; units?: number } = {}
) {
  void logAiUsage({
    tool,
    provider: 'gemini',
    model,
    kind: extra.kind ?? 'tekst',
    inputTokens: usage?.promptTokenCount,
    cachedTokens: usage?.cachedContentTokenCount,
    outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    units: extra.units,
  })
}
