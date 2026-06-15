'use client'

import { cn } from '@/lib/utils'
import { WordChip } from './word-chip'
import type { WordToken, Zone } from './types'

type Status = 'idle' | 'correct' | 'wrong'

interface SentenceBuilderProps {
  tokens: WordToken[]
  draggingId: string | null
  status: Status
  disabled?: boolean
  onDragStart: (token: WordToken, fromZone: Zone) => void
  onDragEnd: () => void
  // Drop at the end of the sentence (or into an empty sentence).
  onDropToEnd: () => void
  // Drop before a specific token (insert/reorder).
  onDropBefore: (token: WordToken) => void
  onChipClick: (token: WordToken, fromZone: Zone) => void
}

export function SentenceBuilder({
  tokens,
  draggingId,
  status,
  disabled = false,
  onDragStart,
  onDragEnd,
  onDropToEnd,
  onDropBefore,
  onChipClick,
}: SentenceBuilderProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-500">Din setning</p>
      <div
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
        }}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          onDropToEnd()
        }}
        className={cn(
          'flex min-h-[80px] flex-wrap content-start items-center gap-3 rounded-xl border-2 p-4 transition-colors',
          status === 'correct' && 'border-green-400 bg-green-50',
          status === 'wrong' && 'border-red-400 bg-red-50',
          status === 'idle' && 'border-blue-300 bg-blue-50/40',
          tokens.length === 0 && 'justify-center'
        )}
      >
        {tokens.length === 0 ? (
          <span className="text-sm text-gray-400">
            Dra ordene hit for å bygge en setning
          </span>
        ) : (
          tokens.map((token) => (
            <WordChip
              key={token.id}
              token={token}
              zone="sentence"
              disabled={disabled}
              isDragging={draggingId === token.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropBefore={onDropBefore}
              onDragOverChip={(e) => {
                if (disabled) return
                e.preventDefault()
              }}
              onClick={onChipClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
