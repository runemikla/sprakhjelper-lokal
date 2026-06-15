'use client'

import { Slider } from '@/components/ui/slider'
import { getLevelInfo, MAX_LEVEL, MIN_LEVEL, type Level } from './types'

interface LevelSelectorProps {
  value: Level
  // Live change while dragging (updates the displayed label).
  onChange: (level: Level) => void
  // Commit when the slider is released (used to regenerate a sentence).
  onCommit?: (level: Level) => void
  disabled?: boolean
}

export function LevelSelector({
  value,
  onChange,
  onCommit,
  disabled = false,
}: LevelSelectorProps) {
  const info = getLevelInfo(value)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-gray-500">Vanskelighetsgrad</span>
        <span className="text-sm font-semibold text-blue-600">
          Nivå {value} av {MAX_LEVEL}
        </span>
      </div>

      <Slider
        value={value}
        min={MIN_LEVEL}
        max={MAX_LEVEL}
        step={1}
        disabled={disabled}
        aria-label="Vanskelighetsgrad"
        aria-valuetext={`Nivå ${value}: ${info.label}`}
        onValueChange={(v) => onChange(v as Level)}
        onValueCommit={(v) => onCommit?.(v as Level)}
      />

      {/* Tick numbers under the track */}
      <div className="mt-1 flex justify-between px-0.5 text-xs text-gray-400">
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
          <span key={i + 1}>{i + 1}</span>
        ))}
      </div>

      <div className="mt-3">
        <p className="text-base font-semibold text-gray-900">{info.label}</p>
        <p className="text-sm text-gray-600">{info.description}</p>
      </div>
    </div>
  )
}
