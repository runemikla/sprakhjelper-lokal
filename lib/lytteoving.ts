export const ACCESS_CODE_LENGTH = 4
export const ACCESS_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/
export const MAX_LISTENING_TASKS = 3

export interface ListeningQuestion {
  question: string
}

export interface AnswerCheckResult {
  isCorrect: boolean
  feedback: string
}

export interface ListeningTaskPayload {
  position: number
  originalText?: string
  questions: ListeningQuestion[]
  audioBase64: string
  audioMimeType: string
}

export interface SavedListeningExercise {
  id: number
  accessCode: string
  originalText: string
  taskCount: number
  createdAt: string
}

export interface ListeningExerciseListRow {
  id: number
  access_code: string
  created_at: string
  listening_tasks?:
    | { position: number; original_text: string }[]
    | { position: number; original_text: string }
    | null
}

export function normalizeAccessCode(value: string): string {
  return value.trim().toUpperCase()
}

export function isValidAccessCode(value: string): boolean {
  return ACCESS_CODE_PATTERN.test(normalizeAccessCode(value))
}

export function previewText(text: string, maxLength = 80): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength).trimEnd()}…`
}

export function mapSavedExercise(row: ListeningExerciseListRow): SavedListeningExercise {
  const tasks = Array.isArray(row.listening_tasks)
    ? row.listening_tasks
    : row.listening_tasks
      ? [row.listening_tasks]
      : []
  const sorted = [...tasks].sort((a, b) => a.position - b.position)

  return {
    id: row.id,
    accessCode: row.access_code,
    originalText: previewText(sorted[0]?.original_text ?? ''),
    taskCount: sorted.length,
    createdAt: row.created_at,
  }
}
