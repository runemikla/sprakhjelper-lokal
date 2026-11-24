'use client'

import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PAUSE_OPTIONS, RATE_OPTIONS, type TalkSettings } from '@/lib/snakkebot/settings'

interface SettingsPanelProps {
  settings: TalkSettings
  onChange: (patch: Partial<TalkSettings>) => void
  onClose: () => void
}

// «Talemodus»: how the conversation works for this student, in every chatbot.
export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const auto = settings.mode === 'auto'

  return (
    <div
      role="dialog"
      aria-label="Talemodus"
      className="absolute inset-x-2 top-2 z-20 max-h-[calc(100%-1rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl sm:inset-x-auto sm:right-4 sm:top-4 sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Talemodus</h2>
          <p className="mt-1 text-sm text-gray-600">Valgene gjelder alle snakkebotene.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-gray-900">Modus</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { value: 'auto', label: 'Automatisk', hint: 'Mikrofonen åpner seg selv og sender når du tar en pause.' },
              { value: 'manual', label: 'Manuell', hint: 'Trykk på mikrofonen for å snakke, og igjen for å sende.' },
            ] as const
          ).map((option) => {
            const checked = settings.mode === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors',
                  checked ? 'border-vlfk-ink bg-vlfk-surface-muted' : 'border-gray-200 hover:border-gray-400'
                )}
              >
                <span className="flex items-center gap-2 font-medium text-gray-900">
                  <input
                    type="radio"
                    name="talemodus"
                    value={option.value}
                    checked={checked}
                    onChange={() => onChange({ mode: option.value })}
                    className="h-4 w-4 accent-vlfk-ink"
                  />
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-gray-600">{option.hint}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className={cn('mt-5 space-y-1.5', !auto && 'opacity-50')}>
        <p className="text-sm font-semibold text-gray-900">Pause før sending</p>
        <Select
          value={String(settings.pauseMs)}
          onValueChange={(v) => onChange({ pauseMs: Number(v) })}
          disabled={!auto}
        >
          <SelectTrigger aria-label="Pause før sending" className="h-10 w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAUSE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">Hvor lenge det må være stille før svaret ditt sendes. Velg lengre pause hvis du trenger tid til å tenke.</p>
      </div>

      <div className="mt-5 space-y-1.5">
        <p className="text-sm font-semibold text-gray-900">Talehastighet</p>
        <Select value={String(settings.rate)} onValueChange={(v) => onChange({ rate: Number(v) })}>
          <SelectTrigger aria-label="Talehastighet" className="h-10 w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-gray-900">Skjul meldingene</span>
          <span className="block text-xs text-gray-500">Bare lytt og snakk, uten tekst på skjermen.</span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            role="switch"
            checked={settings.hideMessages}
            onChange={(e) => onChange({ hideMessages: e.target.checked })}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-vlfk-ink peer-focus-visible:ring-2 peer-focus-visible:ring-vlfk-ink peer-focus-visible:ring-offset-2" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
    </div>
  )
}
