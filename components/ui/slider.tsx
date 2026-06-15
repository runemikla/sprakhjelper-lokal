'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value: number
  min?: number
  max?: number
  step?: number
  // Fires continuously while dragging.
  onValueChange?: (value: number) => void
  // Fires once when the user releases the slider (pointer/touch/keyboard).
  onValueCommit?: (value: number) => void
}

// Lightweight slider built on a native range input (no extra dependencies).
// Styled via the Tailwind `accent` utility for the filled track and thumb.
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  className,
  disabled,
  ...props
}: SliderProps) {
  const handleCommit = (e: React.SyntheticEvent<HTMLInputElement>) => {
    onValueCommit?.(Number((e.target as HTMLInputElement).value))
  }

  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      onPointerUp={handleCommit}
      onKeyUp={handleCommit}
      onTouchEnd={handleCommit}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-400',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      {...props}
    />
  )
}
