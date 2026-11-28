// Snakkeboter som JSON-filer: formatet admin laster opp på /snakkebot/importer
// og laster ned fra redigeringssiden. Én fil er én snakkebot (et objekt), men
// en fil kan også ha en liste med flere. Ingen serverkode her, så både
// nettleseren (forhåndssjekk) og API-et (/api/snakkebot/importer) bruker den.

import { CHATBOT_LEVELS, LIMITS, isLevel, type Chatbot, type ChatbotLevel } from './types'

export const IMPORT_FORMAT = 'sprakhjelp-snakkebot'
export const IMPORT_VERSION = 1

export const IMPORT_LIMITS = {
  // filer per opplasting
  files: 50,
  // snakkeboter per opplasting (summen av alle filene)
  bots: 50,
  // tegn per fil
  fileChars: 100_000,
} as const

// Slik ser en fil ut. Nøklene er norske; de engelske (name, description,
// instructions, greeting, level, voice) godtas også.
export interface ChatbotFile {
  format?: string
  versjon?: number
  navn: string
  beskrivelse?: string
  instruks: string
  forste_melding?: string
  niva?: ChatbotLevel | ''
  stemme?: string
}

// Den ferdig sjekkede snakkeboten, klar til å lagres.
export interface ImportedChatbot {
  name: string
  description: string
  instructions: string
  greeting: string
  level: ChatbotLevel | null
  // tom = standardstemmen
  voice: string
}

export interface ParsedEntry {
  // «fil.json», eller «fil.json (nr. 2)» når filen har en liste
  label: string
  bot: ImportedChatbot | null
  errors: string[]
  warnings: string[]
}

// Svaret fra /api/snakkebot/importer, én per snakkebot.
export interface ImportResult {
  label: string
  ok: boolean
  id?: string
  name?: string
  accessCode?: string
  errors: string[]
  warnings: string[]
}

const FIELDS: { key: keyof ImportedChatbot; names: string[] }[] = [
  { key: 'name', names: ['navn', 'name'] },
  { key: 'description', names: ['beskrivelse', 'description'] },
  { key: 'instructions', names: ['instruks', 'instructions'] },
  { key: 'greeting', names: ['forste_melding', 'første_melding', 'forsteMelding', 'greeting'] },
  { key: 'level', names: ['niva', 'nivå', 'level'] },
  { key: 'voice', names: ['stemme', 'voice'] },
]
const KNOWN = new Set(['format', 'versjon', 'version', ...FIELDS.flatMap((f) => f.names)])

const LABELS: Record<keyof ImportedChatbot, string> = {
  name: 'navn',
  description: 'beskrivelse',
  instructions: 'instruks',
  greeting: 'forste_melding',
  level: 'niva',
  voice: 'stemme',
}

const MAX: Partial<Record<keyof ImportedChatbot, number>> = {
  name: LIMITS.name,
  description: LIMITS.description,
  instructions: LIMITS.instructions,
  greeting: LIMITS.greeting,
}

function pick(obj: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) if (name in obj) return obj[name]
  return undefined
}

function checkOne(value: unknown): Omit<ParsedEntry, 'label'> {
  const errors: string[] = []
  const warnings: string[] = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { bot: null, errors: ['Må være et JSON-objekt med { "navn": …, "instruks": … }.'], warnings }
  }
  const obj = value as Record<string, unknown>

  const text: Partial<Record<keyof ImportedChatbot, string>> = {}
  for (const field of FIELDS) {
    const raw = pick(obj, field.names)
    if (raw === undefined || raw === null) continue
    if (typeof raw !== 'string') {
      errors.push(`«${LABELS[field.key]}» må være tekst.`)
      continue
    }
    const trimmed = raw.trim()
    const max = MAX[field.key]
    if (max && trimmed.length > max) {
      errors.push(`«${LABELS[field.key]}» er for lang (${trimmed.length} tegn, høyst ${max}).`)
    }
    text[field.key] = trimmed
  }

  if (!text.name) errors.push('Mangler «navn».')
  if (!text.instructions) errors.push('Mangler «instruks».')

  let level: ChatbotLevel | null = null
  if (text.level) {
    const upper = text.level.toUpperCase()
    if (isLevel(upper)) level = upper
    else errors.push(`«niva» må være ${CHATBOT_LEVELS.join(', ')} eller tom (fikk «${text.level}»).`)
  }

  const format = obj.format
  if (format !== undefined && format !== IMPORT_FORMAT) {
    warnings.push(`«format» er «${String(format)}», ventet «${IMPORT_FORMAT}». Filen er lest likevel.`)
  }
  const unknown = Object.keys(obj).filter((k) => !KNOWN.has(k))
  if (unknown.length > 0) {
    warnings.push(`Ukjente felt blir ikke brukt: ${unknown.map((k) => `«${k}»`).join(', ')}.`)
  }

  if (errors.length > 0) return { bot: null, errors, warnings }
  return {
    bot: {
      name: text.name!,
      description: text.description ?? '',
      instructions: text.instructions!,
      greeting: text.greeting ?? '',
      level,
      voice: text.voice ?? '',
    },
    errors,
    warnings,
  }
}

/** Leser og sjekker én fil. Gir én oppføring per snakkebot i filen. */
export function parseChatbotFile(fileName: string, content: string): ParsedEntry[] {
  if (content.length > IMPORT_LIMITS.fileChars) {
    return [{ label: fileName, bot: null, errors: ['Filen er for stor.'], warnings: [] }]
  }
  let data: unknown
  try {
    // tåler BOM fra Windows-redigeringsprogrammer
    data = JSON.parse(content.replace(/^﻿/, ''))
  } catch (e) {
    const detail = e instanceof Error ? ` (${e.message})` : ''
    return [{ label: fileName, bot: null, errors: [`Ikke gyldig JSON${detail}.`], warnings: [] }]
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return [{ label: fileName, bot: null, errors: ['Listen i filen er tom.'], warnings: [] }]
    return data.map((item, i) => ({ label: `${fileName} (nr. ${i + 1})`, ...checkOne(item) }))
  }
  return [{ label: fileName, ...checkOne(data) }]
}

/** Snakkeboten som fil, i samme format som opplastingen. */
export function chatbotToFile(bot: Pick<Chatbot, 'name' | 'description' | 'instructions' | 'greeting' | 'level' | 'voice'>): ChatbotFile {
  return {
    format: IMPORT_FORMAT,
    versjon: IMPORT_VERSION,
    navn: bot.name,
    beskrivelse: bot.description,
    instruks: bot.instructions,
    forste_melding: bot.greeting,
    niva: bot.level ?? '',
    stemme: bot.voice,
  }
}

/** Filnavn uten rare tegn: «På kafeen» → «pa-kafeen.json». */
export function chatbotFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'snakkebot'}.json`
}

export const EXAMPLE_FILE: ChatbotFile = {
  format: IMPORT_FORMAT,
  versjon: IMPORT_VERSION,
  navn: 'På kafeen',
  beskrivelse: 'Bestill mat og drikke på en kafé.',
  instruks:
    'Du er Kari, som jobber i kassen på en kafé i Bergen. Eleven er en kunde som skal bestille. Spør hva eleven vil ha, foreslå noe å drikke, og si hva det koster. Still ett spørsmål om gangen.',
  forste_melding: 'Hei, og velkommen! Hva kan jeg hjelpe deg med i dag?',
  niva: 'A2',
  stemme: 'Erinome',
}

/** Laster ned JSON som fil i nettleseren. */
export function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
