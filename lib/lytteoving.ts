export const ACCESS_CODE_LENGTH = 4
export const ACCESS_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/

export interface ListeningQuestion {
  question: string
}

export interface AnswerCheckResult {
  isCorrect: boolean
  feedback: string
}

export interface SavedListeningExercise {
  id: number
  accessCode: string
  originalText: string
  createdAt: string
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
