// Snakkebot: voice chatbots that teachers make and students talk to.
// Shared by the browser and the server routes.

export const CHATBOT_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
export type ChatbotLevel = (typeof CHATBOT_LEVELS)[number]

export const LEVEL_LABELS: Record<ChatbotLevel, string> = {
  A1: 'A1 – nybegynner',
  A2: 'A2 – grunnleggende',
  B1: 'B1 – selvstendig',
  B2: 'B2 – godt selvstendig',
}

export const LIMITS = {
  name: 80,
  description: 300,
  instructions: 4000,
  greeting: 300,
  // per message in a conversation
  message: 1500,
  // messages sent to the model per request (older ones are dropped)
  history: 40,
  // seconds of speech per recording (Google's synchronous limit is 60)
  recordingSeconds: 55,
} as const

export interface Chatbot {
  id: string
  name: string
  description: string
  instructions: string
  greeting: string
  voice: string
  level: ChatbotLevel | null
  accessCode: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  groupIds: string[]
}

// What the student's browser gets: no instructions.
export interface PublicChatbot {
  id: string
  name: string
  description: string
  greeting: string
  level: ChatbotLevel | null
  accessCode: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// How the browser points the server at a chatbot: by id (logged-in users
// with access through a group, or the teacher) or by its share code.
export type ChatbotRef = { id: string } | { code: string }

export const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function isChatbotCode(value: string): boolean {
  return CODE_PATTERN.test(normalizeCode(value))
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

// /snakkebot/<ref> takes either the id or the code.
export function parseRef(value: string): ChatbotRef | null {
  if (isUuid(value)) return { id: value.toLowerCase() }
  const code = normalizeCode(value)
  return CODE_PATTERN.test(code) ? { code } : null
}

export function refQuery(ref: ChatbotRef): string {
  return 'id' in ref ? `id=${encodeURIComponent(ref.id)}` : `kode=${encodeURIComponent(ref.code)}`
}

export function isLevel(value: unknown): value is ChatbotLevel {
  return (CHATBOT_LEVELS as readonly string[]).includes(String(value))
}
