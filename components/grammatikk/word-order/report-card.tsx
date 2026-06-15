'use client'

import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LEVELS } from './types'
import type { Report } from './use-report'

interface ReportCardProps {
  report: Report
  onClose: () => void
  onClear: () => void
}

export function ReportCard({ report, onClose, onClear }: ReportCardProps) {
  // Aggregate totals across all levels.
  const totals = Object.values(report.perLevel).reduce(
    (acc, stat) => ({
      correct: acc.correct + stat.correct,
      wrong: acc.wrong + stat.wrong,
    }),
    { correct: 0, wrong: 0 }
  )

  // Only the levels the student has actually practised (any answer recorded).
  const playedLevels = LEVELS.filter((l) => {
    const stat = report.perLevel[l.value]
    return stat && (stat.correct > 0 || stat.wrong > 0)
  })

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardContent className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Rapport</h2>
          <div className="flex items-center gap-3 text-2xl font-bold">
            <span className="text-green-600">{totals.correct}</span>
            <span className="text-red-600">{totals.wrong}</span>
          </div>
        </div>

        {/* Per-level overview – only levels the student has practised */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            Oversikt per nivå
          </h3>
          {playedLevels.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen nivåer øvd på ennå.</p>
          ) : (
            <div className="space-y-2">
              {playedLevels.map((l) => {
                const stat = report.perLevel[l.value]!
                return (
                  <div
                    key={l.value}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <span className="min-w-0 text-sm text-gray-700">
                      <span className="font-semibold">Nivå {l.value}</span>
                      <span className="text-gray-400"> · </span>
                      {l.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 font-semibold">
                      <span className="text-green-600">{stat.correct}</span>
                      <span className="text-red-600">{stat.wrong}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mistake list */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            Dine feil ({report.mistakes.length})
          </h3>
          {report.mistakes.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen feil registrert ennå.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {report.mistakes.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="mb-1 text-xs font-semibold text-gray-500">
                    Nivå {m.level}
                  </div>
                  <div className="text-red-700">
                    Ditt svar: {m.attempt || '—'}
                  </div>
                  <div className="text-green-700">Riktig: {m.correct}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
            Tilbake til øvelsen
          </Button>
          <Button
            variant="outline"
            onClick={onClear}
            disabled={report.mistakes.length === 0 && totals.correct === 0 && totals.wrong === 0}
          >
            <Trash2 className="h-4 w-4" />
            Tøm rapport
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
