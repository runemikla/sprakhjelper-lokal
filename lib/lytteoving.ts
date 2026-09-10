export const ACCESS_CODE_LENGTH = 4
export const ACCESS_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/
export const MAX_LISTENING_TASKS = 3

export const QUESTION_TYPE = {
  open: 'open',
  statement: 'statement',
} as const

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE]

export interface ListeningQuestion {
  question: string
  questionType?: QuestionType
  isTrue?: boolean | null
}

export function normalizeQuestionType(value: unknown): QuestionType {
  return value === QUESTION_TYPE.statement
    ? QUESTION_TYPE.statement
    : QUESTION_TYPE.open
}

export function isStatementQuestion(question: ListeningQuestion): boolean {
  return normalizeQuestionType(question.questionType) === QUESTION_TYPE.statement
}

export function isStatementTask(questions: ListeningQuestion[]): boolean {
  return (
    questions.length > 0 && questions.every((item) => isStatementQuestion(item))
  )
}

export function formatListeningAnswer(
  question: ListeningQuestion,
  answer: string
): string {
  if (isStatementQuestion(question)) {
    if (answer === 'true') return 'Sant'
    if (answer === 'false') return 'Usant'
    return answer.trim() || '(tomt svar)'
  }
  return answer.trim() || '(tomt svar)'
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
