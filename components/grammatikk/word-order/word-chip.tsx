'use client'

import { cn } from '@/lib/utils'
import type { WordToken, Zone } from './types'

interface WordChipProps {
  token: WordToken
  zone: Zone
  disabled?: boolean
  isDragging?: boolean
  onDragStart: (token: WordToken, fromZone: Zone) => void
  onDragEnd: () => void
  // Allows dropping a dragged chip directly before this chip (for reordering).
  onDropBefore?: (token: WordToken) => void
  onDragOverChip?: (e: React.DragEvent) => void
  // Click to move the token to the other zone (keyboard/touch friendly fallback).
  onClick?: (token: WordToken, fromZone: Zone) => void
}

export function WordChip({
  token,
  zone,
  disabled = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onDragOverChip,
  onClick,
}: WordChipProps) {
  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onDragStart={() => onDragStart(token, zone)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverChip}
      onDrop={(e) => {
        if (!onDropBefore) return
        e.preventDefault()
        e.stopPropagation()
        onDropBefore(token)
      }}
      onClick={() => onClick?.(token, zone)}
      className={cn(
        'select-none rounded-lg border-2 px-4 py-2 text-lg font-medium shadow-sm transition-all',
        'border-blue-200 bg-white text-gray-900',
        !disabled && 'cursor-grab hover:border-blue-400 hover:shadow active:cursor-grabbing',
        disabled && 'cursor-default opacity-70',
        isDragging && 'opacity-40'
      )}
    >
      {token.text}
    </button>
  )
}
