'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Download, FileJson, Loader2, Pencil, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import {
  EXAMPLE_FILE,
  IMPORT_LIMITS,
  downloadJson,
  parseChatbotFile,
  type ImportResult,
  type ParsedEntry,
} from '@/lib/snakkebot/import'
import { LIMITS } from '@/lib/snakkebot/types'
import { useAvailableVoices } from '@/lib/tts/use-available-voices'
import { cn } from '@/lib/utils'

interface ChosenFile {
  name: string
  content: string
  entries: ParsedEntry[]
}

const FIELD_ROWS: { key: string; required?: boolean; text: string }[] = [
  { key: 'navn', required: true, text: `Navnet elevene ser (høyst ${LIMITS.name} tegn).` },
  { key: 'instruks', required: true, text: `Hvem snakkeboten er og hva elevene skal øve på (høyst ${LIMITS.instructions} tegn).` },
  { key: 'beskrivelse', text: `Kort tekst elevene ser før samtalen (høyst ${LIMITS.description} tegn).` },
  { key: 'forste_melding', text: 'Det snakkeboten sier først. Tom: snakkeboten hilser selv.' },
  { key: 'niva', text: 'A1, A2, B1 eller B2. Tom: ikke valgt.' },
  { key: 'stemme', text: 'Navnet på en stemme fra Admin → Stemmer, for eksempel Erinome. Tom: standardstemmen.' },
]

const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

function Messages({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5 text-sm">
      {errors.map((m) => (
        <li key={m} className="text-red-800">
          {m}
        </li>
      ))}
      {warnings.map((m) => (
        <li key={m} className="text-amber-900">
          {m}
        </li>
      ))}
    </ul>
  )
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (!ok) return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-label="Feil" />
  if (warn) return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-label="Merknad" />
  return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-label="OK" />
}

// Admin uploads JSON files; every chatbot in them is saved as a new chatbot.
export function ChatbotImporter({ userEmail, isAdmin }: { userEmail: string | null; isAdmin: boolean }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ChosenFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const { voices, loaded: voicesLoaded } = useAvailableVoices()

  async function addFiles(list: FileList | File[]) {
    setError(null)
    setResults(null)
    const chosen = await Promise.all(
      Array.from(list).map(async (file) => {
        const content =
          file.size > IMPORT_LIMITS.fileChars * 4 ? '' : await file.text().catch(() => '')
        const entries =
          file.size > IMPORT_LIMITS.fileChars * 4
            ? [{ label: file.name, bot: null, errors: ['Filen er for stor.'], warnings: [] }]
            : parseChatbotFile(file.name, content)
        return { name: file.name, content, entries }
      })
    )
    setFiles((current) => {
      // same file name again replaces the old one
      const names = new Set(chosen.map((f) => f.name))
      return [...current.filter((f) => !names.has(f.name)), ...chosen]
    })
  }

  // The voice is checked again on the server; here it shows the error before
  // the upload, so the count on the button is right.
  const entries = files.flatMap((f) =>
    f.entries.map((entry) => {
      const wanted = entry.bot?.voice.trim().toLowerCase()
      if (!entry.bot || !wanted || !voicesLoaded) return entry
      const known = voices.some(
        (v) => v.id.toLowerCase() === wanted || v.googleName.toLowerCase() === wanted || (v.displayName ?? '').trim().toLowerCase() === wanted
      )
      if (known) return entry
      return {
        ...entry,
        bot: null,
        errors: [
          `Stemmen «${entry.bot.voice}» finnes ikke blant stemmene i Språkhjelp. Bruk en av: ${voices.map((v) => v.id).join(', ')}, eller la «stemme» stå tom.`,
        ],
      }
    })
  )
  const valid = entries.filter((e) => e.bot).length
  const tooMany = files.length > IMPORT_LIMITS.files || entries.length > IMPORT_LIMITS.bots

  async function upload() {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/snakkebot/importer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files.map((f) => ({ name: f.name, content: f.content })) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || body.message || 'Kunne ikke laste opp filene.')
      setResults(body.results as ImportResult[])
      setFiles([])
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke laste opp filene.')
    } finally {
      setUploading(false)
    }
  }

  const added = results?.filter((r) => r.ok) ?? []
  const failed = results?.filter((r) => !r.ok) ?? []

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        backHref="/snakkebot"
        backLabel="Alle snakkeboter"
        title="Last opp snakkeboter"
        description="Last opp én eller flere JSON-filer. Hver snakkebot i filene blir en ny snakkebot med egen kode."
      />

      <Card className={card}>
        <CardContent className="space-y-6 pt-6">
          {results && (
            <section className="space-y-3" aria-live="polite">
              <h2 className="text-lg font-semibold text-gray-900">
                {added.length === 1 ? '1 snakkebot lagt til' : `${added.length} snakkeboter lagt til`}
                {failed.length > 0 && `, ${failed.length} feilet`}
              </h2>
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <li
                    key={`${r.label}-${i}`}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border px-4 py-3',
                      r.ok ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
                    )}
                  >
                    <StatusIcon ok={r.ok} warn={r.warnings.length > 0} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {r.ok ? r.name : r.label}
                        {r.ok && <span className="ml-2 text-sm font-normal text-gray-500">{r.label}</span>}
                      </p>
                      {r.ok && r.accessCode && (
                        <p className="text-xs text-gray-500">
                          Kode <span className="font-mono font-bold tracking-[0.2em] text-gray-900">{r.accessCode}</span>
                          {' · ikke delt med grupper'}
                        </p>
                      )}
                      <Messages errors={r.errors} warnings={r.warnings} />
                    </div>
                    {r.ok && r.id && (
                      <Button asChild variant="outline" size="icon">
                        <Link href={`/snakkebot/${r.id}/rediger`} aria-label={`Rediger ${r.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/snakkebot">Til snakkebotene</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => setResults(null)}>
                  Last opp flere
                </Button>
              </div>
            </section>
          )}

          {!results && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files)
                }}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                  dragging ? 'border-vlfk-ink bg-vlfk-lyseblaa/15' : 'border-gray-300 bg-vlfk-surface-muted'
                )}
              >
                <FileJson className="h-8 w-8 text-gray-500" />
                <p className="text-sm text-gray-700">
                  Dra JSON-filene hit, eller velg dem. Du kan velge mange filer samtidig (høyst {IMPORT_LIMITS.files}).
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,application/json"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) void addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Velg JSON-filer
                </Button>
              </div>

              {files.length > 0 && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {files.length === 1 ? '1 fil valgt' : `${files.length} filer valgt`}
                    </h2>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFiles([])}>
                      Fjern alle
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {entries.map((entry, i) => (
                      <li
                        key={`${entry.label}-${i}`}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border px-4 py-3',
                          entry.bot ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
                        )}
                      >
                        <StatusIcon ok={!!entry.bot} warn={entry.warnings.length > 0} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {entry.bot ? entry.bot.name : entry.label}
                            {entry.bot && <span className="ml-2 text-sm font-normal text-gray-500">{entry.label}</span>}
                          </p>
                          {entry.bot && (
                            <p className="text-xs text-gray-500">
                              {[entry.bot.level, entry.bot.voice || 'standardstemme'].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <Messages errors={entry.errors} warnings={entry.warnings} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  {tooMany && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      Du kan laste opp høyst {IMPORT_LIMITS.files} filer og {IMPORT_LIMITS.bots} snakkeboter om gangen.
                    </div>
                  )}
                  {valid < entries.length && valid > 0 && (
                    <p className="text-sm text-gray-600">Filene med feil blir hoppet over. De andre lastes opp.</p>
                  )}
                </section>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
              )}

              {files.length > 0 && (
                <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                  <Button type="button" onClick={() => void upload()} disabled={uploading || valid === 0 || tooMany}>
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {valid === 1 ? 'Last opp 1 snakkebot' : `Last opp ${valid} snakkeboter`}
                  </Button>
                </div>
              )}
            </>
          )}

          <section className="space-y-3 border-t border-gray-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Slik ser filen ut</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => downloadJson('eksempel-snakkebot.json', EXAMPLE_FILE)}>
                <Download className="h-4 w-4" /> Last ned eksempelfil
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Én fil er én snakkebot. En fil kan også ha en liste <code>[ … ]</code> med flere. Du kan laste ned en
              snakkebot du har laget fra redigeringssiden («Last ned som JSON») og bruke den som mal.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-vlfk-surface-muted p-3 text-xs leading-relaxed text-gray-800">
              {JSON.stringify(EXAMPLE_FILE, null, 2)}
            </pre>
            <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 text-sm">
              {FIELD_ROWS.map((row) => (
                <div key={row.key} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr]">
                  <dt className="font-mono text-gray-900">
                    {row.key}
                    {row.required && <span className="ml-1 font-sans text-xs text-gray-500">(må være med)</span>}
                  </dt>
                  <dd className="text-gray-700">{row.text}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-gray-600">
              Snakkebotene deles ikke med grupper når de lastes opp. Åpne en snakkebot og velg grupper, eller gi elevene koden.
            </p>
          </section>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
