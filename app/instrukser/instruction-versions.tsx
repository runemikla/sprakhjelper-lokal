'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { InstructionVariable } from '@/lib/ai/instructions'
import {
  activateInstructionVersion,
  createInstructionVersion,
  deleteInstructionVersion,
  type ActionResult,
} from './actions'

export interface InstructionVersion {
  id: string
  name: string
  content: string
  is_active: boolean
  created_at: string
}

interface InstructionVersionsProps {
  instructionKey: string
  title: string
  route: string
  variables: InstructionVariable[]
  defaultTemplate: string
  versions: InstructionVersion[]
  // False when the instruction_versions table is not reachable (for example
  // before the migration is applied). The page is then read-only.
  canEdit: boolean
}

// "default" stands for the built-in instruction from lib/ai/instructions.ts.
const DEFAULT_ID = 'default'

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Oslo',
})

function placeholdersIn(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) names.add(match[1])
  return [...names]
}

export function InstructionVersions({
  instructionKey,
  title,
  route,
  variables,
  defaultTemplate,
  versions,
  canEdit,
}: InstructionVersionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const activeVersion = versions.find((version) => version.is_active) ?? null
  const activeId = activeVersion?.id ?? DEFAULT_ID

  const [selectedId, setSelectedId] = useState<string>(activeId)
  const [editor, setEditor] = useState<{ name: string; content: string; activate: boolean } | null>(
    null
  )

  const options = useMemo(
    () => [
      { id: DEFAULT_ID, name: 'Standard (fra koden)', content: defaultTemplate, created_at: null },
      ...versions,
    ],
    [defaultTemplate, versions]
  )
  const selected = options.find((option) => option.id === selectedId) ?? options[0]

  function run(action: () => Promise<ActionResult>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(successMessage)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function activate(id: string) {
    run(
      () =>
        activateInstructionVersion({
          instructionKey,
          versionId: id === DEFAULT_ID ? null : id,
        }),
      'Versjonen er nå i bruk i verktøyet.'
    )
  }

  function remove(id: string) {
    if (!window.confirm('Slette denne versjonen? Dette kan ikke angres.')) return
    run(
      () => deleteInstructionVersion({ instructionKey, versionId: id }),
      'Versjonen er slettet.',
      () => setSelectedId(activeId)
    )
  }

  function save() {
    if (!editor) return
    run(
      () => createInstructionVersion({ instructionKey, ...editor }),
      editor.activate ? 'Versjonen er lagret og tatt i bruk.' : 'Versjonen er lagret.',
      () => setEditor(null)
    )
  }

  // Warn (without blocking) about placeholders that will not be filled in, and
  // about variables the default uses that the new text leaves out.
  const editorWarnings = useMemo(() => {
    if (!editor) return []
    const known = new Set(variables.map((variable) => variable.name))
    const used = placeholdersIn(editor.content)
    const warnings: string[] = []
    const unknown = used.filter((name) => !known.has(name))
    if (unknown.length > 0) {
      warnings.push(
        `Ukjente variabler blir stående som tekst: ${unknown.map((name) => `{{${name}}}`).join(', ')}`
      )
    }
    const missing = placeholdersIn(defaultTemplate).filter((name) => !used.includes(name))
    if (missing.length > 0) {
      warnings.push(
        `Standardinstruksen bruker variabler som mangler her: ${missing.map((name) => `{{${name}}}`).join(', ')}`
      )
    }
    return warnings
  }, [editor, variables, defaultTemplate])

  return (
    <details className="group rounded-lg border border-gray-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-medium text-gray-800 hover:text-blue-600">
        <span>
          {title}
          <span className="ml-2 text-xs font-normal text-gray-400">{route}</span>
        </span>
        <span className="flex items-center gap-2">
          <Badge variant={activeVersion ? 'default' : 'secondary'} className="font-normal">
            {activeVersion ? activeVersion.name : 'Standard'}
          </Badge>
          <span
            aria-hidden="true"
            className="text-gray-400 transition-transform group-open:rotate-90"
          >
            ›
          </span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-gray-100 px-4 py-4">
        {variables.length > 0 && (
          <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-gray-700">
            <p className="mb-1 font-medium">Variabler som fylles inn per forespørsel:</p>
            <ul className="space-y-1">
              {variables.map((variable) => (
                <li key={variable.name}>
                  <code className="rounded bg-white px-1 py-0.5 text-xs">{`{{${variable.name}}}`}</code>{' '}
                  {variable.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Version list */}
        <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {options.map((option) => {
            const isActive = option.id === activeId
            const isSelected = option.id === selected.id
            return (
              <div
                key={option.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(option.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className={`truncate ${isSelected ? 'font-semibold' : ''}`}>
                    {option.name}
                  </span>
                  {option.created_at && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {dateFormatter.format(new Date(option.created_at))}
                    </span>
                  )}
                  {isActive && <Badge className="shrink-0">I bruk</Badge>}
                </button>
                {canEdit && (
                  <div className="flex shrink-0 gap-2">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => activate(option.id)}
                      >
                        Bruk denne
                      </Button>
                    )}
                    {!isActive && option.id !== DEFAULT_ID && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={isPending}
                        onClick={() => remove(option.id)}
                      >
                        Slett
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Editor for a new version, or the selected version read-only */}
        {editor ? (
          <div className="space-y-3 rounded-md border border-blue-200 p-3">
            <div className="space-y-1">
              <Label htmlFor={`${instructionKey}-name`}>Navn på ny versjon</Label>
              <Input
                id={`${instructionKey}-name`}
                value={editor.name}
                maxLength={200}
                placeholder="For eksempel «Kortere forklaringer»"
                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${instructionKey}-content`}>Instruks</Label>
              <Textarea
                id={`${instructionKey}-content`}
                autosize
                autosizeProps={{ minRows: 10, maxRows: 40 }}
                value={editor.content}
                onChange={(event) => setEditor({ ...editor, content: event.target.value })}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
            {editorWarnings.length > 0 && (
              <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {editorWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editor.activate}
                onChange={(event) => setEditor({ ...editor, activate: event.target.checked })}
              />
              Ta i bruk med en gang
            </label>
            <div className="flex gap-2">
              <Button disabled={isPending || !editor.name.trim()} onClick={save}>
                {isPending ? 'Lagrer…' : 'Lagre versjon'}
              </Button>
              <Button variant="outline" disabled={isPending} onClick={() => setEditor(null)}>
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">
                Viser: <span className="font-medium">{selected.name}</span>
              </p>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditor({ name: '', content: selected.content, activate: false })
                  }
                >
                  Ny versjon basert på denne
                </Button>
              )}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
              {selected.content}
            </pre>
          </div>
        )}
      </div>
    </details>
  )
}
