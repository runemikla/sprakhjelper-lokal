import { createClient } from '@/lib/supabase/server'
import { getEnvModelConfig, guessModelType, sendChatCompletion, type AzureModelConfig } from '@/lib/ai/azure-core'
import { geminiTextToSpeech, isGeminiTtsConfigured } from '@/lib/tts/gemini'
import { googleTextToSpeech } from '@/lib/tts/google'
import { DEFAULT_CHOSEN_VOICE, isGeminiVoice } from '@/lib/tts/gemini-voices'
import { isValidVoiceId } from '@/lib/tts/voices'
import { buildSystemPrompt, END_INSTRUCTION, START_MESSAGE } from './prompt'
import { cleanReply } from './text'
import {
  isLevel,
  isUuid,
  LIMITS,
  parseCollectionRef,
  type Chatbot,
  type ChatbotRef,
  type ChatMessage,
  type PublicCollection,
} from './types'

// Server side of Snakkebot: finding the chatbot, asking the language model
// and reading the answer aloud. Nothing from the conversation is stored.
//
// Environment variables (all optional):
//   CHATBOT_DEPLOYMENT        Azure AI Foundry deployment, default gpt-6-luna.
//                             Endpoint and key come from AZURE_OPENAI_*.
//   CHATBOT_API_VERSION       default v1
//   CHATBOT_REASONING_EFFORT  none | minimal | low | medium | high. Not set:
//                             the lowest the model accepts (none, then
//                             minimal, then low), for quick answers.
//   CHATBOT_PROVIDER          azure (default) or gemini, for testing without
//                             Azure (uses GEMINI_API_KEY and GEMINI_CHAT_MODEL)
//   SNAKKEBOT_TTS             google (default: Google Cloud TTS, Chirp 3 HD
//                             voices, same setup as Lytteøving) or gemini
//                             (Gemini TTS voices with the same names).

interface ChatbotRow {
  id: string
  name: string
  description: string
  instructions: string
  greeting: string
  voice: string
  level: string | null
  access_code: string
  created_by?: string
  collection_goals?: string
}

function toChatbot(row: ChatbotRow): Chatbot {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    instructions: row.instructions,
    greeting: row.greeting ?? '',
    voice: row.voice,
    level: isLevel(row.level) ? row.level : null,
    accessCode: row.access_code,
    createdBy: row.created_by,
    groupIds: [],
    collectionGoals: row.collection_goals ?? undefined,
  }
}

/**
 * Finds a chatbot the caller may use: by its share code (anyone with the
 * code), or by id (row level security: owner, admin or member of a group the
 * chatbot is shared with). Returns null when it does not exist or is hidden.
 */
export async function loadChatbot(ref: ChatbotRef): Promise<Chatbot | null> {
  const supabase = await createClient()
  if ('collection' in ref) {
    // A case in a collection: by the collection's code (anyone), or by its id
    // (row level security: admins, teachers and members of a shared group).
    if (!isUuid(ref.collection)) {
      const { data, error } = await supabase.rpc('get_chatbot_in_collection_by_code', {
        p_access_code: ref.collection,
        p_chatbot_id: ref.id,
      })
      if (error) throw new Error(error.message)
      const row = (Array.isArray(data) ? data[0] : data) as ChatbotRow | undefined
      return row ? toChatbot(row) : null
    }
    const { data: item, error: itemError } = await supabase
      .from('chatbot_collection_items')
      .select('chatbot_id, chatbot_collections(goals)')
      .eq('collection_id', ref.collection)
      .eq('chatbot_id', ref.id)
      .maybeSingle()
    if (itemError) throw new Error(itemError.message)
    if (!item) return null
    const bot = await loadChatbot({ id: ref.id })
    if (!bot) return null
    const collection = (item as { chatbot_collections: { goals: string } | { goals: string }[] | null }).chatbot_collections
    const goals = Array.isArray(collection) ? collection[0]?.goals : collection?.goals
    return { ...bot, collectionGoals: goals ?? '' }
  }
  if ('code' in ref) {
    const { data, error } = await supabase.rpc('get_chatbot_by_code', { p_access_code: ref.code })
    if (error) throw new Error(error.message)
    const row = (Array.isArray(data) ? data[0] : data) as ChatbotRow | undefined
    return row ? toChatbot(row) : null
  }
  const { data, error } = await supabase
    .from('chatbots')
    .select('id, name, description, instructions, greeting, voice, level, access_code, created_by')
    .eq('id', ref.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toChatbot(data as ChatbotRow) : null
}

interface CollectionJson {
  id: string
  name: string
  description: string
  goals: string
  access_code: string
  bots: { id: string; name: string; description: string; level: string | null }[]
}

/**
 * A collection and its cases (names only, no instructions), by its code
 * (anyone) or its id (row level security). Null when it does not exist or
 * is hidden.
 */
export async function loadCollection(ref: string): Promise<PublicCollection | null> {
  const supabase = await createClient()
  if (!isUuid(ref)) {
    const { data, error } = await supabase.rpc('get_chatbot_collection_by_code', { p_access_code: ref })
    if (error) throw new Error(error.message)
    const row = data as CollectionJson | null
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      goals: row.goals ?? '',
      accessCode: row.access_code,
      bots: row.bots ?? [],
    }
  }
  const { data, error } = await supabase
    .from('chatbot_collections')
    .select('id, name, description, goals, access_code, chatbot_collection_items(position, chatbots(id, name, description, level))')
    .eq('id', ref)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  type Item = { position: number; chatbots: CollectionJson['bots'][number] | CollectionJson['bots'][number][] | null }
  const row = data as Omit<CollectionJson, 'bots'> & { chatbot_collection_items: Item[] }
  const bots = (row.chatbot_collection_items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => (Array.isArray(item.chatbots) ? item.chatbots[0] : item.chatbots))
    .filter((b): b is CollectionJson['bots'][number] => Boolean(b))
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    goals: row.goals ?? '',
    accessCode: row.access_code,
    bots,
  }
}

export function readRef(url: URL): ChatbotRef | null {
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('kode')
  const collection = url.searchParams.get('samling')
  if (collection) {
    const parsed = parseCollectionRef(collection)
    return parsed && id && isUuid(id) ? { collection: parsed, id: id.toLowerCase() } : null
  }
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return { id: id.toLowerCase() }
  if (code) {
    const normalized = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (/^[A-Z0-9]{4}$/.test(normalized)) return { code: normalized }
  }
  return null
}

// ---------------------------------------------------------------------------
// Language model
// ---------------------------------------------------------------------------

export function chatbotModel(): AzureModelConfig {
  const deployment = process.env.CHATBOT_DEPLOYMENT?.trim() || 'gpt-6-luna'
  return {
    ...getEnvModelConfig(),
    deployment,
    apiVersion: process.env.CHATBOT_API_VERSION?.trim() || 'v1',
    modelType: guessModelType(deployment),
    reasoningEffort: process.env.CHATBOT_REASONING_EFFORT?.trim() || EFFORTS[effortIndex],
  }
}

// Lowest reasoning effort first: thinking makes the student wait. Models
// accept different values, so on «unsupported value» the next one is tried
// and remembered for the rest of the server's life.
const EFFORTS = ['none', 'minimal', 'low'] as const
let effortIndex = 0

function useGemini(): boolean {
  return process.env.CHATBOT_PROVIDER?.trim().toLowerCase() === 'gemini'
}

export function isChatModelConfigured(): boolean {
  if (useGemini()) return isGeminiTtsConfigured()
  const { endpoint, apiKey } = getEnvModelConfig()
  return Boolean(endpoint && apiKey)
}

/** A failed answer from the language model, with a hint an admin can act on. */
export class ChatModelError extends Error {
  readonly hint: string
  constructor(message: string, hint: string) {
    super(message)
    this.name = 'ChatModelError'
    this.hint = hint
  }
}

/**
 * The model's content filter stopped the turn (Azure «content_filter» /
 * ResponsibleAIPolicyViolation, Gemini SAFETY). Often a speech-to-text slip,
 * like «spise deg her» for «spise det her», so the student just tries again.
 */
export class ContentFilterError extends Error {
  constructor(detail: string) {
    super(`Innholdsfilteret stoppet svaret: ${detail}`)
    this.name = 'ContentFilterError'
  }
}

function isContentFilter(code: string, message: string): boolean {
  return /content_filter|ResponsibleAIPolicyViolation|content management policy/i.test(`${code} ${message}`)
}

function azureHint(status: number, code: string, message: string, deployment: string): string {
  const text = `${code} ${message}`
  if (status === 404 || /DeploymentNotFound|does not exist|not found/i.test(text)) {
    return `Fant ikke deploymenten «${deployment}» i Azure. Sjekk navnet i Azure AI Foundry, og sett CHATBOT_DEPLOYMENT i Coolify hvis det er et annet.`
  }
  if (status === 401 || status === 403) return 'Azure godtok ikke nøkkelen. Sjekk AZURE_OPENAI_API_KEY og AZURE_OPENAI_ENDPOINT.'
  if (status === 429) return 'Azure-kvoten for deploymenten er brukt opp for nå. Vent litt, eller øk kvoten i Azure.'
  if (/api-version|api version/i.test(text)) return 'Azure godtok ikke API-versjonen. Prøv CHATBOT_API_VERSION=2025-04-01-preview i Coolify.'
  if (/reasoning_effort|temperature|max_completion_tokens|unsupported/i.test(text)) {
    return 'Modellen godtok ikke en av innstillingene. Prøv CHATBOT_REASONING_EFFORT=medium, eller se feilen under.'
  }
  return 'Azure svarte med en feil. Se detaljene under.'
}

async function openAzureStream(system: string, messages: ChatMessage[]): Promise<Response> {
  for (;;) {
    const config = chatbotModel()
    let response: Response
    try {
      response = await sendChatCompletion(config, {
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.7,
        max_completion_tokens: 400,
        stream: true,
      })
    } catch (error) {
      const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : ''
      throw new ChatModelError(
        `Kunne ikke nå Azure: ${error instanceof Error ? error.message : error}${cause}`,
        'Kunne ikke nå Azure. Sjekk AZURE_OPENAI_ENDPOINT.'
      )
    }
    if (response.ok) return response

    const raw = await response.text().catch(() => '')
    let code = ''
    let message = raw
    try {
      const parsed = JSON.parse(raw) as { error?: { code?: string; message?: string } }
      code = parsed.error?.code ?? ''
      message = parsed.error?.message ?? raw
    } catch {
      // not JSON
    }
    if (isContentFilter(code, raw)) throw new ContentFilterError(message.slice(0, 300))
    // The model does not take this reasoning effort: try the next one.
    if (
      response.status === 400 &&
      /reasoning_effort|reasoning effort/i.test(message) &&
      !process.env.CHATBOT_REASONING_EFFORT?.trim() &&
      effortIndex < EFFORTS.length - 1
    ) {
      console.warn(`snakkebot: reasoning_effort ${EFFORTS[effortIndex]} avvist, prøver ${EFFORTS[effortIndex + 1]}`)
      effortIndex++
      continue
    }
    throw new ChatModelError(
      `Azure (${config.deployment}, api ${config.apiVersion}) svarte ${response.status}${code ? ` ${code}` : ''}: ${message.slice(0, 300)}`,
      azureHint(response.status, code, message, config.deployment)
    )
  }
}

/** The answer from Azure, piece by piece as it is written (server-sent events). */
async function* azureStream(system: string, messages: ChatMessage[]): AsyncGenerator<string> {
  const response = await openAzureStream(system, messages)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sent = false
  let finish = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      let chunk: { choices?: { delta?: { content?: string }; finish_reason?: string | null }[] }
      try {
        chunk = JSON.parse(data)
      } catch {
        continue
      }
      const choice = chunk.choices?.[0]
      if (choice?.finish_reason) finish = choice.finish_reason
      const text = choice?.delta?.content
      if (text) {
        sent = true
        yield text
      }
    }
  }
  if (finish === 'content_filter' && !sent) throw new ContentFilterError('finish_reason content_filter')
  if (!sent) {
    throw new ChatModelError(
      `Tomt svar fra ${chatbotModel().deployment} (finish_reason: ${finish || 'ukjent'})`,
      'Modellen sendte et tomt svar. For reasoning-modeller betyr det ofte at tokengrensen ble brukt opp; prøv CHATBOT_REASONING_EFFORT=minimal.'
    )
  }
}

async function geminiReply(system: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || ''
  const model = process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-3.8-flash'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    }
  )
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Gemini svarte ${response.status}: ${detail.slice(0, 300)}`)
  }
  const data = await response.json()
  const blocked = data.promptFeedback?.blockReason || (data.candidates?.[0]?.finishReason === 'SAFETY' ? 'SAFETY' : '')
  if (blocked) throw new ContentFilterError(String(blocked))
  const parts = (data.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]
  return parts.map((p) => p.text ?? '').join('')
}

/**
 * The chatbot's next answer, piece by piece as the model writes it, so the
 * browser can start reading the first sentence aloud early. An empty
 * conversation gets a greeting. Pieces are raw model text (the browser
 * cleans markdown away).
 */
export async function* chatbotReplyStream(
  bot: Chatbot,
  history: ChatMessage[],
  options: { ending?: boolean } = {}
): AsyncGenerator<string> {
  let system = buildSystemPrompt({
    name: bot.name,
    instructions: bot.instructions,
    level: bot.level,
    goals: bot.collectionGoals,
  })
  if (options.ending) system += `\n\n${END_INSTRUCTION}`
  let messages = history.slice(-LIMITS.history)
  // The model needs the conversation to start with the student.
  if (messages.length === 0 || messages[0].role === 'assistant') {
    messages = [{ role: 'user', content: START_MESSAGE }, ...messages]
  }
  if (useGemini()) {
    const reply = await geminiReply(system, messages)
    if (!reply.trim()) throw new Error('Tomt svar fra språkmodellen')
    yield reply
    return
  }
  let length = 0
  for await (const piece of azureStream(system, messages)) {
    yield piece
    length += piece.length
    if (length > 2000) return
  }
}

/** The whole answer at once (used by the admin check). */
export async function chatbotReply(bot: Chatbot, history: ChatMessage[]): Promise<string> {
  let raw = ''
  for await (const piece of chatbotReplyStream(bot, history)) raw += piece
  const reply = cleanReply(raw)
  if (!reply) throw new Error('Tomt svar fra språkmodellen')
  return reply.slice(0, 2000)
}

// ---------------------------------------------------------------------------
// Reading the answer aloud
// ---------------------------------------------------------------------------

const SPEAKING_STYLE: Record<string, string> = {
  A1: 'Say slowly, warmly and very clearly, in Norwegian Bokmål',
  A2: 'Say slowly, warmly and clearly, in Norwegian Bokmål',
  B1: 'Say in a friendly, natural and clear way, in Norwegian Bokmål',
  B2: 'Say in a friendly and natural way, in Norwegian Bokmål',
}

export async function chatbotSpeech(bot: Chatbot, text: string): Promise<{ audio: Buffer; mimeType: string }> {
  const voice = isValidVoiceId(bot.voice) ? bot.voice : DEFAULT_CHOSEN_VOICE
  const provider = process.env.SNAKKEBOT_TTS?.trim().toLowerCase()

  // Gemini only when asked for (or when Google Cloud is not set up at all).
  const googleReady = Boolean(process.env.GOOGLE_TTS_CREDENTIALS?.trim() || process.env.GOOGLE_TTS_API_KEY?.trim())
  if ((provider === 'gemini' || !googleReady) && isGeminiTtsConfigured()) {
    const style = SPEAKING_STYLE[bot.level ?? 'A2'] ?? SPEAKING_STYLE.A2
    // Gemini has only the Chirp 3 HD names; other voices fall back to the default.
    const geminiVoice = isGeminiVoice(voice) ? voice : DEFAULT_CHOSEN_VOICE
    return { audio: await geminiTextToSpeech(text, geminiVoice, style), mimeType: 'audio/wav' }
  }
  const rate = bot.level === 'A1' ? 0.85 : bot.level === 'A2' ? 0.92 : 1
  return { audio: await googleTextToSpeech(text, rate, voice), mimeType: 'audio/mpeg' }
}
