'use client'

// Temporary storage for the UI preview: word lists are kept in this
// browser's localStorage. Replace with Supabase calls when the database
// tables exist (see docs/ORDLISTER_DATABASE.md).

import { generateAccessCode, type WordList } from './types'

const KEY = 'ordlister:lists'

function readAll(): WordList[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as WordList[]) : []
  } catch {
    return []
  }
}

function writeAll(lists: WordList[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists))
  } catch {
    // Ignore: blocked storage simply means nothing is remembered.
  }
}

export const wordListStore = {
  list(): WordList[] {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  get(id: string): WordList | undefined {
    return readAll().find((l) => l.id === id)
  },
  getByCode(code: string): WordList | undefined {
    return readAll().find((l) => l.accessCode === code)
  },
  save(list: Omit<WordList, 'id' | 'accessCode' | 'createdAt' | 'updatedAt'> & Partial<WordList>): WordList {
    const all = readAll()
    const now = new Date().toISOString()
    const existing = list.id ? all.find((l) => l.id === list.id) : undefined
    const taken = new Set(all.map((l) => l.accessCode))
    let code = existing?.accessCode ?? generateAccessCode()
    while (!existing && taken.has(code)) code = generateAccessCode()

    const saved: WordList = {
      id: existing?.id ?? crypto.randomUUID(),
      accessCode: code,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      title: list.title,
      languages: list.languages,
      words: list.words,
    }
    writeAll(existing ? all.map((l) => (l.id === saved.id ? saved : l)) : [...all, saved])
    return saved
  },
  remove(id: string) {
    writeAll(readAll().filter((l) => l.id !== id))
  },
}
