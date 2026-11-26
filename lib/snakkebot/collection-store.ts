'use client'

// Collections («Samlinger») in Supabase, from the admin's browser. Row level
// security decides what may be read and changed (see
// supabase/migrations/20261126120000_create_chatbot_collections.sql).

import { createClient } from '@/lib/supabase/client'
import type { ChatbotCollection } from './types'

interface CollectionRow {
  id: string
  name: string
  description: string
  goals: string
  access_code: string
  chatbot_collection_items: { chatbot_id: string; position: number }[]
  chatbot_collection_groups: { group_id: string }[]
}

export interface ChatbotOption {
  id: string
  name: string
  description: string
  level: string | null
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback)
}

export const collectionStore = {
  async get(id: string): Promise<ChatbotCollection | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('chatbot_collections')
      .select(
        'id, name, description, goals, access_code, chatbot_collection_items(chatbot_id, position), chatbot_collection_groups(group_id)'
      )
      .eq('id', id)
      .maybeSingle()
    if (error) fail(error, 'Kunne ikke hente samlingen.')
    if (!data) return null
    const row = data as CollectionRow
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      goals: row.goals ?? '',
      accessCode: row.access_code,
      chatbotIds: (row.chatbot_collection_items ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((i) => i.chatbot_id),
      groupIds: (row.chatbot_collection_groups ?? []).map((g) => g.group_id),
    }
  },

  // All chatbots the admin can put in a collection.
  async chatbots(): Promise<ChatbotOption[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('chatbots').select('id, name, description, level').order('name')
    if (error) fail(error, 'Kunne ikke hente snakkebotene.')
    return (data ?? []) as ChatbotOption[]
  },

  // Saves the collection, its chatbots (in this order) and groups; returns its id.
  async save(collection: Omit<ChatbotCollection, 'id' | 'accessCode'> & { id?: string }): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('save_chatbot_collection', {
      p_id: collection.id ?? null,
      p_name: collection.name,
      p_description: collection.description,
      p_goals: collection.goals,
      p_chatbot_ids: collection.chatbotIds,
      p_group_ids: collection.groupIds,
    })
    if (error) fail(error, 'Kunne ikke lagre samlingen.')
    return data as string
  },

  async remove(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('chatbot_collections').delete().eq('id', id)
    if (error) fail(error, 'Kunne ikke slette samlingen.')
  },
}
