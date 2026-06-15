'use client'

import { useCallback, useState } from 'react'
import type { Level } from './types'

// A single mistake the student made, stored for the report.
export interface Mistake {
  id: string
  level: Level
  attempt: string
  correct: string
  timestamp: number
}

export interface LevelStat {
  correct: number
  wrong: number
}

// The full report persisted in the browser's localStorage.
export interface Report {
  perLevel: Record<number, LevelStat>
  mistakes: Mistake[]
}

function emptyReport(): Report {
  return { perLevel: {}, mistakes: [] }
}

// Hook that tracks per-level correct/wrong counts and a list of mistakes.
// State is kept in memory only, so it resets on page refresh (and can be
// cleared explicitly via clearReport, e.g. when starting a new session).
export function useReport() {
  const [report, setReport] = useState<Report>(emptyReport)

  // Record one result for a level. Wrong answers also append a mistake entry.
  const recordResult = useCallback(
    (
      level: Level,
      isCorrect: boolean,
      attempt?: string,
      correct?: string
    ) => {
      setReport((prev) => {
        const perLevel = { ...prev.perLevel }
        const stat = perLevel[level] ?? { correct: 0, wrong: 0 }
        perLevel[level] = isCorrect
          ? { ...stat, correct: stat.correct + 1 }
          : { ...stat, wrong: stat.wrong + 1 }

        const mistakes = isCorrect
          ? prev.mistakes
          : [
              {
                id: crypto.randomUUID(),
                level,
                attempt: attempt ?? '',
                correct: correct ?? '',
                timestamp: Date.now(),
              },
              ...prev.mistakes,
            ]

        return { perLevel, mistakes }
      })
    },
    []
  )

  const clearReport = useCallback(() => {
    setReport(emptyReport())
  }, [])

  return { report, recordResult, clearReport }
}
