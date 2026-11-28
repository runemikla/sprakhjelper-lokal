import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { getAvailableVoices } from '@/lib/tts/available-voices'
import { defaultVoiceOf, ttsVoiceLabel } from '@/lib/tts/voices'
import { IMPORT_LIMITS, parseChatbotFile, type ImportResult } from '@/lib/snakkebot/import'

// Admin laster opp JSON-filer, og hver snakkebot i filene lagres som en ny
// snakkebot (samme save_chatbot-RPC som redigeringssiden). Admin sjekkes her
// på serveren, og RLS («Admins can create chatbots») sjekker det igjen i
// databasen. Grupper settes ikke; snakkebotene deles etterpå.
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const limited = checkRateLimit(req, 10, 60_000)
  if (limited) return limited

  const { error: notAdmin } = await requireAdmin()
  if (notAdmin) return notAdmin

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel.' }, { status: 400 })
  }
  const files = (body as { files?: unknown })?.files
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'Velg minst én JSON-fil.' }, { status: 400 })
  }
  if (files.length > IMPORT_LIMITS.files) {
    return NextResponse.json(
      { error: `Du kan laste opp høyst ${IMPORT_LIMITS.files} filer om gangen.` },
      { status: 400 }
    )
  }

  const entries = files.flatMap((file, i) => {
    const name = typeof file?.name === 'string' && file.name ? file.name.slice(0, 200) : `fil ${i + 1}`
    const content = typeof file?.content === 'string' ? file.content : ''
    return parseChatbotFile(name, content)
  })
  if (entries.length > IMPORT_LIMITS.bots) {
    return NextResponse.json(
      { error: `Filene har ${entries.length} snakkeboter. Du kan laste opp høyst ${IMPORT_LIMITS.bots} om gangen.` },
      { status: 400 }
    )
  }

  const voices = await getAvailableVoices()
  const defaultVoice = defaultVoiceOf(voices)
  function findVoice(wanted: string) {
    const w = wanted.trim().toLowerCase()
    return voices.find(
      (v) =>
        v.id.toLowerCase() === w ||
        v.googleName.toLowerCase() === w ||
        (v.displayName ?? '').trim().toLowerCase() === w
    )
  }

  const supabase = await createClient()
  const { data: existing } = await supabase.from('chatbots').select('name')
  const existingNames = new Set(((existing ?? []) as { name: string }[]).map((r) => r.name.trim().toLowerCase()))

  const results: ImportResult[] = []
  for (const entry of entries) {
    const errors = [...entry.errors]
    const warnings = [...entry.warnings]
    const bot = entry.bot
    let voice = defaultVoice
    if (bot?.voice) {
      const match = findVoice(bot.voice)
      if (match) voice = match.id
      else
        errors.push(
          `Stemmen «${bot.voice}» finnes ikke blant stemmene i Språkhjelp. Bruk en av: ${voices
            .map((v) => v.id)
            .join(', ')}, eller la «stemme» stå tom.`
        )
    }
    if (!bot || errors.length > 0) {
      results.push({ label: entry.label, ok: false, errors, warnings })
      continue
    }
    if (!bot.voice) {
      const label = voices.find((v) => v.id === voice)
      warnings.push(`Ingen stemme valgt, bruker ${label ? ttsVoiceLabel(label) : voice}.`)
    }
    const key = bot.name.toLowerCase()
    if (existingNames.has(key)) {
      warnings.push('Det fantes allerede en snakkebot med samme navn. Denne ble lagt til i tillegg.')
    }

    const { data: id, error } = await supabase.rpc('save_chatbot', {
      p_id: null,
      p_name: bot.name,
      p_description: bot.description,
      p_instructions: bot.instructions,
      p_greeting: bot.greeting,
      p_voice: voice,
      p_level: bot.level ?? '',
      p_group_ids: [],
    })
    if (error || !id) {
      console.error('Chatbot import failed:', error?.message)
      results.push({
        label: entry.label,
        ok: false,
        errors: ['Kunne ikke lagre snakkeboten i databasen.'],
        warnings,
      })
      continue
    }
    existingNames.add(key)
    const { data: row } = await supabase.from('chatbots').select('access_code').eq('id', id).maybeSingle()
    results.push({
      label: entry.label,
      ok: true,
      id: id as string,
      name: bot.name,
      accessCode: (row as { access_code?: string } | null)?.access_code,
      errors: [],
      warnings,
    })
  }

  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
}
