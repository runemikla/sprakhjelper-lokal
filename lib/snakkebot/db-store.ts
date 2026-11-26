'use client'

// Chatbots in Supabase, from the browser with the signed-in user's session.
// Row level security decides what each user may see and change (see
// supabase/migrations/20261124120000_create_chatbots.sql).

import { createClient } from '@/lib/supabase/client'
import { isLevel, type Chatbot } from './types'

interface ChatbotRow {
  id: string
  name: string
  description: string
  instructions: string
  greeting: string
  voice: string
  level: string | null
  access_code: string
  created_by: string
  created_at: string
  updated_at: string
  chatbot_groups: { group_id: string }[]
}

const SELECT =
  'id, name, description, instructions, greeting, voice, level, access_code, created_by, created_at, updated_at, chatbot_groups(group_id)'

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    groupIds: (row.chatbot_groups ?? []).map((g) => g.group_id),
  }
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback)
}

export const chatbotStore = {
  async get(id: string): Promise<Chatbot | null> {
    const supabase = createClient()
    const { data, error } = await supabase.from('chatbots').select(SELECT).eq('id', id).maybeSingle()
    if (error) fail(error, 'Kunne ikke hente snakkeboten.')
    return data ? toChatbot(data as ChatbotRow) : null
  },

  // Saves the chatbot and its groups, and returns its id.
  async save(bot: Omit<Chatbot, 'id' | 'accessCode'> & { id?: string }): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('save_chatbot', {
      p_id: bot.id ?? null,
      p_name: bot.name,
      p_description: bot.description,
      p_instructions: bot.instructions,
      p_greeting: bot.greeting,
      p_voice: bot.voice,
      p_level: bot.level ?? '',
      p_group_ids: bot.groupIds,
    })
    if (error) fail(error, 'Kunne ikke lagre snakkeboten.')
    return data as string
  },

  async remove(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('chatbots').delete().eq('id', id)
    if (error) fail(error, 'Kunne ikke slette snakkeboten.')
  },
}
