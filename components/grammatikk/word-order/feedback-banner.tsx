'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'correct' | 'wrong'

interface FeedbackBannerProps {
  status: Status
}

export function FeedbackBanner({ status }: FeedbackBannerProps) {
  if (status === 'idle') return null

  const isCorrect = status === 'correct'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 px-1 py-1 text-base font-medium',
        isCorrect ? 'text-green-700' : 'text-red-700'
      )}
    >
      {isCorrect ? (
        <CheckCircle2 className="h-6 w-6 shrink-0" />
      ) : (
        <XCircle className="h-6 w-6 shrink-0" />
      )}
      <span>
        {isCorrect
          ? 'Riktig! Godt jobbet! Lager en ny setning …'
          : 'Ikke helt riktig ennå. Prøv å flytte om på ordene.'}
      </span>
    </div>
  )
}
