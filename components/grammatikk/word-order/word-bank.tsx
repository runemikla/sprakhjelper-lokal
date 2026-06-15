'use client'

import { cn } from '@/lib/utils'
import { WordChip } from './word-chip'
import type { WordToken, Zone } from './types'

interface WordBankProps {
  tokens: WordToken[]
  draggingId: string | null
  disabled?: boolean
  onDragStart: (token: WordToken, fromZone: Zone) => void
  onDragEnd: () => void
  // Drop anywhere in the bank (returns a token to the bank).
  onDropToBank: () => void
  onChipClick: (token: WordToken, fromZone: Zone) => void
}

export function WordBank({
  tokens,
  draggingId,
  disabled = false,
  onDragStart,
  onDragEnd,
  onDropToBank,
  onChipClick,
}: WordBankProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-500">Ordbank</p>
      <div
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
        }}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          onDropToBank()
        }}
        className={cn(
          'flex min-h-[72px] flex-wrap content-start gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4',
          tokens.length === 0 && 'items-center justify-center'
        )}
      >
        {tokens.length === 0 ? (
          <span className="text-sm text-gray-400">Alle ordene er brukt</span>
        ) : (
          tokens.map((token) => (
            <WordChip
              key={token.id}
              token={token}
              zone="bank"
              disabled={disabled}
              isDragging={draggingId === token.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onChipClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
