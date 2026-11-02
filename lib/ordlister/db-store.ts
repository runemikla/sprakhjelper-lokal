'use client'

// Word lists and groups in Supabase. Runs in the browser with the signed-in
// user's session, so the row level security policies decide what each user
// may see and change (see supabase/migrations/20261102100000_*.sql).

import { createClient } from '@/lib/supabase/client'
import type { Group, ItemContent, MediaKind, WordList, WordListItem } from './types'

interface ItemRow {
  id: string
  position: number
  word: string
  image_description: string
  content: ItemContent | null
  media: Partial<Record<MediaKind, string>> | null
}

interface ListRow {
  id: string
  title: string
  languages: string[]
  created_by: string
  created_at: string
  updated_at: string
  word_list_items: ItemRow[]
  word_list_groups: { group_id: string }[]
}

const LIST_SELECT =
  'id, title, languages, created_by, created_at, updated_at, word_list_items(id, position, word, image_description, content, media), word_list_groups(group_id)'

function toList(row: ListRow): WordList {
  return {
    id: row.id,
    title: row.title,
    languages: row.languages ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    groupIds: (row.word_list_groups ?? []).map((g) => g.group_id),
    words: [...(row.word_list_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        word: item.word,
        imageDescription: item.image_description ?? '',
        content: item.content ?? undefined,
        media: item.media ?? undefined,
      })),
  }
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback)
}

export const wordListStore = {
  // Every list the user may read: own lists (teachers), lists shared with
  // the user's groups (students) or all lists (admins).
  async list(): Promise<WordList[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('word_lists')
      .select(LIST_SELECT)
      .order('updated_at', { ascending: false })
    if (error) fail(error, 'Kunne ikke hente ordlistene.')
    return ((data ?? []) as unknown as ListRow[]).map(toList)
  },

  async get(id: string): Promise<WordList | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('word_lists')
      .select(LIST_SELECT)
      .eq('id', id)
      .maybeSingle()
    if (error) fail(error, 'Kunne ikke hente ordlisten.')
    return data ? toList(data as unknown as ListRow) : null
  },

  // Saves title, languages, words and groups in one transaction and returns
  // the stored list. Words keep their generated content and media.
  async save(list: {
    id?: string
    title: string
    languages: string[]
    words: WordListItem[]
    groupIds: string[]
  }): Promise<WordList> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('save_word_list', {
      p_id: list.id ?? null,
      p_title: list.title,
      p_languages: list.languages,
      p_items: list.words.map((w) => ({
        id: w.id,
        word: w.word,
        image_description: w.imageDescription,
        content: w.content ?? null,
        media: w.media ?? {},
      })),
      p_group_ids: list.groupIds,
    })
    if (error) fail(error, 'Kunne ikke lagre ordlisten.')
    const saved = await this.get(data as string)
    if (!saved) throw new Error('Ordlisten ble lagret, men kunne ikke hentes igjen.')
    return saved
  },

  // Stores generated text and media versions for one word.
  async patchItem(itemId: string, patch: { content?: ItemContent; media?: Partial<Record<MediaKind, string>> }) {
    const supabase = createClient()
    const { error } = await supabase.from('word_list_items').update(patch).eq('id', itemId)
    if (error) fail(error, 'Kunne ikke lagre innholdet.')
  },

  async remove(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('word_lists').delete().eq('id', id)
    if (error) fail(error, 'Kunne ikke slette ordlisten.')
    // Files in storage: best effort, the list itself is already gone.
    const { data } = await supabase.storage.from('word-lists').list(id, { limit: 1000 })
    if (data?.length) {
      await supabase.storage.from('word-lists').remove(data.map((f) => `${id}/${f.name}`))
    }
  },
}

interface GroupRow {
  id: string
  name: string
  access_code: string | null
  owner_email: string | null
  member_count: number
  is_owner: boolean
  is_member: boolean
  created_at: string
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    accessCode: row.access_code,
    ownerEmail: row.owner_email,
    memberCount: Number(row.member_count),
    isOwner: row.is_owner,
    isMember: row.is_member,
    createdAt: row.created_at,
  }
}

export const groupStore = {
  // Groups the user owns or belongs to (admins: every group).
  async list(): Promise<Group[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('list_my_groups')
    if (error) fail(error, 'Kunne ikke hente gruppene.')
    return ((data ?? []) as GroupRow[]).map(toGroup)
  },

  async create(name: string): Promise<void> {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Du må logge inn.')
    const { error } = await supabase
      .from('groups')
      .insert({ name, created_by: userData.user.id })
    if (error) fail(error, 'Kunne ikke lage gruppen.')
  },

  async rename(id: string, name: string) {
    const supabase = createClient()
    const { error } = await supabase.from('groups').update({ name }).eq('id', id)
    if (error) fail(error, 'Kunne ikke endre navnet.')
  },

  async remove(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) fail(error, 'Kunne ikke slette gruppen.')
  },

  // Returns the group that was joined, or null when the code is unknown.
  async join(code: string): Promise<{ id: string; name: string } | null> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('join_group', { p_code: code })
    if (error) fail(error, 'Kunne ikke bli med i gruppen.')
    const rows = (data ?? []) as { id: string; name: string }[]
    return rows[0] ?? null
  },

  async members(groupId: string): Promise<{ userId: string; email: string | null; joinedAt: string }[]> {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_group_members', { p_group_id: groupId })
    if (error) fail(error, 'Kunne ikke hente medlemmene.')
    return ((data ?? []) as { user_id: string; email: string | null; joined_at: string }[]).map((m) => ({
      userId: m.user_id,
      email: m.email,
      joinedAt: m.joined_at,
    }))
  },

  async removeMember(groupId: string, userId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (error) fail(error, 'Kunne ikke fjerne medlemmet.')
  },
}
