import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'
import {
  getInstructionDefinition,
  renderInstruction,
  type InstructionKey,
} from '@/lib/ai/instructions'

// Server-side lookup of the instruction a tool should use right now: the
// version an admin has activated in Supabase, or the built-in default from
// lib/ai/instructions.ts when none is active or the lookup fails.

// Short in-memory cache so every AI request does not hit the database. An
// activation on the admin page clears it right away in this process.
const CACHE_TTL_MS = 30_000

interface CacheEntry {
  template: string | null
  expiresAt: number
}

const cache = new Map<InstructionKey, CacheEntry>()

export function clearInstructionCache(key?: InstructionKey) {
  if (key) cache.delete(key)
  else cache.clear()
}

// The tools are used by students who are not logged in, so this uses a plain
// anon client (no cookies) and the get_active_instruction() database function,
// which only exposes the active content for one key.
async function fetchActiveTemplate(key: InstructionKey): Promise<string | null> {
  const { url, key: anonKey } = getSupabaseEnv()
  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('get_active_instruction', {
    p_instruction_key: key,
  })

  if (error) throw error
  return typeof data === 'string' && data.length > 0 ? data : null
}

async function getActiveTemplate(key: InstructionKey): Promise<string | null> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.template

  try {
    const template = await fetchActiveTemplate(key)
    cache.set(key, { template, expiresAt: Date.now() + CACHE_TTL_MS })
    return template
  } catch (error) {
    // Never break a tool because of the lookup: fall back to the default and
    // try the database again on the next request.
    console.error(
      `Could not load active instruction "${key}", using default:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

// Returns the finished system prompt for a tool, with variables filled in.
export async function getInstruction(
  key: InstructionKey,
  variables: Record<string, string | number> = {}
): Promise<string> {
  const definition = getInstructionDefinition(key)
  if (!definition) throw new Error(`Unknown instruction key: ${key}`)

  const template = (await getActiveTemplate(key)) ?? definition.defaultTemplate
  return renderInstruction(template, variables)
}
