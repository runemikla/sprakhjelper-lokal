'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { COMMON_LANGUAGES } from '@/lib/ordlister/types'
import { cn } from '@/lib/utils'

interface LanguagePickerProps {
  value: string[]
  onChange: (languages: string[]) => void
}

// Multi-select of the students' first languages, with room for one that
// is not in the list.
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const [other, setOther] = useState('')
  const selected = new Set(value)
  const custom = value.filter((l) => !(COMMON_LANGUAGES as readonly string[]).includes(l))

  function toggle(language: string) {
    onChange(selected.has(language) ? value.filter((l) => l !== language) : [...value, language])
  }

  function addOther() {
    const name = other.trim()
    if (!name) return
    const formatted = name.charAt(0).toUpperCase() + name.slice(1)
    if (!value.some((l) => l.toLowerCase() === formatted.toLowerCase())) {
      onChange([...value, formatted])
    }
    setOther('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Morsmål">
        {[...COMMON_LANGUAGES, ...custom].map((language) => {
          const on = selected.has(language)
          return (
            <button
              key={language}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(language)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                on
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700'
              )}
            >
              {language}
              {on && <X className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex max-w-sm gap-2">
        <Input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addOther()
            }
          }}
          placeholder="Annet språk …"
          aria-label="Legg til et annet språk"
          className="bg-white"
        />
        <Button type="button" variant="outline" onClick={addOther} disabled={!other.trim()}>
          <Plus className="h-4 w-4" />
          Legg til
        </Button>
      </div>
    </div>
  )
}
