import { createClient } from '@/lib/supabase/server'
import { getEnvModelConfig, guessModelType, sendChatCompletion, type AzureModelConfig } from '@/lib/ai/azure-core'
import { geminiTextToSpeech, isGeminiTtsConfigured } from '@/lib/tts/gemini'
import { googleTextToSpeech } from '@/lib/tts/google'
import { DEFAULT_CHOSEN_VOICE, isGeminiVoice } from '@/lib/tts/gemini-voices'
import { buildSystemPrompt, START_MESSAGE } from './prompt'
import { isLevel, LIMITS, type Chatbot, type ChatbotRef, type ChatMessage } from './types'

// Server side of Snakkebot: finding the chatbot, asking the language model
// and reading the answer aloud. Nothing from the conversation is stored.
//
// Environment variables (all optional):
//   CHATBOT_DEPLOYMENT        Azure AI Foundry deployment, default gpt-6.1-luna.
//                             Endpoint and key come from AZURE_OPENAI_*.
//   CHATBOT_API_VERSION       default v1
//   CHATBOT_REASONING_EFFORT  minimal | low | medium | high, default low
//   CHATBOT_PROVIDER          azure (default) or gemini, for testing without
//                             Azure (uses GEMINI_API_KEY and GEMINI_CHAT_MODEL)
//   SNAKKEBOT_TTS             gemini (default) or google (Cloud TTS, Chirp 3 HD
//                             voices with the same names). Gemini falls back
//                             to Google Cloud TTS if it fails.

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
  }
}

/**
 * Finds a chatbot the caller may use: by its share code (anyone with the
 * code), or by id (row level security: owner, admin or member of a group the
 * chatbot is shared with). Returns null when it does not exist or is hidden.
 */
export async function loadChatbot(ref: ChatbotRef): Promise<Chatbot | null> {
  const supabase = await createClient()
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

export function readRef(url: URL): ChatbotRef | null {
  const id = url.searchParams.get('id')
  const code = url.searchParams.get('kode')
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
  const deployment = process.env.CHATBOT_DEPLOYMENT?.trim() || 'gpt-6.1-luna'
  return {
    ...getEnvModelConfig(),
    deployment,
    apiVersion: process.env.CHATBOT_API_VERSION?.trim() || 'v1',
    modelType: guessModelType(deployment),
    reasoningEffort: process.env.CHATBOT_REASONING_EFFORT?.trim() || 'low',
  }
}

function useGemini(): boolean {
  return process.env.CHATBOT_PROVIDER?.trim().toLowerCase() === 'gemini'
}

export function isChatModelConfigured(): boolean {
  if (useGemini()) return isGeminiTtsConfigured()
  const { endpoint, apiKey } = getEnvModelConfig()
  return Boolean(endpoint && apiKey)
}

// Plain spoken text: strip markdown that would be read aloud.
function cleanReply(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+\n/g, '\n')
    .trim()
}

async function azureReply(system: string, messages: ChatMessage[]): Promise<string> {
  const response = await sendChatCompletion(chatbotModel(), {
    messages: [{ role: 'system', content: system }, ...messages],
    temperature: 0.7,
    max_completion_tokens: 400,
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Språkmodellen svarte ${response.status}: ${detail.slice(0, 300)}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
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
  const parts = (data.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]
  return parts.map((p) => p.text ?? '').join('')
}

/** The chatbot's next answer. An empty conversation gets a greeting. */
export async function chatbotReply(bot: Chatbot, history: ChatMessage[]): Promise<string> {
  const system = buildSystemPrompt({ name: bot.name, instructions: bot.instructions, level: bot.level })
  let messages = history.slice(-LIMITS.history)
  // The model needs the conversation to start with the student.
  if (messages.length === 0 || messages[0].role === 'assistant') {
    messages = [{ role: 'user', content: START_MESSAGE }, ...messages]
  }
  const raw = useGemini() ? await geminiReply(system, messages) : await azureReply(system, messages)
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
  const voice = isGeminiVoice(bot.voice) ? bot.voice : DEFAULT_CHOSEN_VOICE
  const provider = process.env.SNAKKEBOT_TTS?.trim().toLowerCase()

  if (provider !== 'google' && isGeminiTtsConfigured()) {
    try {
      const style = SPEAKING_STYLE[bot.level ?? 'A2'] ?? SPEAKING_STYLE.A2
      return { audio: await geminiTextToSpeech(text, voice, style), mimeType: 'audio/wav' }
    } catch (error) {
      if (!process.env.GOOGLE_TTS_CREDENTIALS?.trim()) throw error
      console.error('snakkebot/lyd: Gemini feilet, bruker Google Cloud TTS:', error instanceof Error ? error.message : error)
    }
  }
  const rate = bot.level === 'A1' ? 0.85 : bot.level === 'A2' ? 0.92 : 1
  return { audio: await googleTextToSpeech(text, rate, voice), mimeType: 'audio/mpeg' }
}
