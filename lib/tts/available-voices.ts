import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'
import {
  DEFAULT_AVAILABLE_VOICES,
  describeVoice,
  isValidVoiceId,
  sortVoices,
  type TtsVoice,
  type VoiceGender,
} from './voices'

// The voices the admin has made available in the AI tools (table tts_voices,
// chosen on the admin page /stemmer). Without the table, or with no rows, the
// tools offer the four voices they always had.

const CACHE_TTL_MS = 30_000
let cache: { voices: TtsVoice[]; expiresAt: number } | null = null

export function clearAvailableVoicesCache() {
  cache = null
}

export interface TtsVoiceRow {
  voice_id: string
  google_name: string
  gender: string | null
  // Missing before the migration that adds the column is applied.
  display_name?: string | null
}

export function voiceFromRow(row: TtsVoiceRow): TtsVoice {
  const gender = (['kvinne', 'mann', 'nøytral'] as const).includes(row.gender as VoiceGender)
    ? (row.gender as VoiceGender)
    : null
  return { ...describeVoice(row.google_name, gender), displayName: row.display_name?.trim() || null }
}

/**
 * Reads the rows of tts_voices. Before the column display_name exists
 * (migration 20261127150000 not applied), it reads them without names, so the
 * tools keep working.
 */
export async function selectVoiceRows(
  supabase: SupabaseClient
): Promise<{ rows: TtsVoiceRow[]; hasNames: boolean; error: { message: string } | null }> {
  const withNames = await supabase.from('tts_voices').select('voice_id, google_name, gender, display_name')
  if (!withNames.error) return { rows: (withNames.data ?? []) as TtsVoiceRow[], hasNames: true, error: null }
  const plain = await supabase.from('tts_voices').select('voice_id, google_name, gender')
  return { rows: (plain.data ?? []) as TtsVoiceRow[], hasNames: false, error: plain.error }
}

// Also used where nobody is logged in (Snakkebot by code), so this is a plain
// anon client; the table can be read by everyone.
async function fetchAvailableVoices(): Promise<TtsVoice[]> {
  const { url, key } = getSupabaseEnv()
  const supabase = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { rows, error } = await selectVoiceRows(supabase)
  if (error) throw error
  const voices = rows.filter((r) => isValidVoiceId(r.voice_id)).map(voiceFromRow)
  return voices.length > 0 ? sortVoices(voices) : DEFAULT_AVAILABLE_VOICES
}

/** The voices teachers can choose between. Never throws. */
export async function getAvailableVoices(): Promise<TtsVoice[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.voices
  try {
    const voices = await fetchAvailableVoices()
    cache = { voices, expiresAt: Date.now() + CACHE_TTL_MS }
    return voices
  } catch (error) {
    console.error(
      'Could not load available voices, using the default four:',
      error instanceof Error ? error.message : error
    )
    return DEFAULT_AVAILABLE_VOICES
  }
}
