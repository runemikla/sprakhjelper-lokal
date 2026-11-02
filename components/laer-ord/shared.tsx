import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Safe localStorage access: private windows and blocked storage throw.
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`laer-ord:${key}`)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`laer-ord:${key}`, JSON.stringify(value))
    } catch {
      // Ignore: progress is simply not remembered.
    }
  },
}

interface ExerciseHeaderProps {
  title: string
  hint: string
  score?: ReactNode
}

export function ExerciseHeader({ title, hint, score }: ExerciseHeaderProps) {
  return (
    <div className="mb-5 border-b border-gray-200 pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {score && <span className="text-sm tabular-nums text-gray-500">{score}</span>}
      </div>
      <p className="mt-1 text-sm text-gray-600">{hint}</p>
    </div>
  )
}

export function Feedback({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'right' | 'wrong'
  children: ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        tone === 'right' && 'border-green-300 bg-green-50 text-green-900',
        tone === 'wrong' && 'border-red-300 bg-red-50 text-red-900',
        tone === 'neutral' && 'border-blue-200 bg-blue-50 text-blue-900'
      )}
    >
      {children}
    </div>
  )
}
