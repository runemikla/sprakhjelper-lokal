'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { PreviewNotice } from '@/components/ordlister/preview-notice'
import { CopyLinkButton } from '@/components/ordlister/share-box'
import { wordListStore } from '@/lib/ordlister/local-store'
import type { WordList } from '@/lib/ordlister/types'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface TeacherOverviewProps {
  userEmail?: string | null
  isAdmin?: boolean
}

export function TeacherOverview({ userEmail = null, isAdmin = false }: TeacherOverviewProps) {
  const [lists, setLists] = useState<WordList[] | null>(null)

  useEffect(() => setLists(wordListStore.list()), [])

  function handleDelete(list: WordList) {
    if (!window.confirm(`Vil du slette ordlisten «${list.title}»? Elevene mister tilgangen.`)) return
    wordListStore.remove(list.id)
    setLists(wordListStore.list())
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 pt-6 pb-4">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-gray-900">Mine ordlister</h2>
            <p className="text-sm text-gray-600">
              Lag egne ordlister og del dem med elevene. De øver på ordene i Lær ord med bilde,
              lyd og oversettelse til morsmålet sitt.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/ordlister/ny">
              <Plus className="h-4 w-4" /> Lag ny
            </Link>
          </Button>
        </div>

        <CardContent className="space-y-4 pt-6">
          <PreviewNotice />

          {lists === null ? (
            <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Laster …
            </div>
          ) : lists.length === 0 ? (
            <p className="text-gray-600">
              Du har ikke laget noen ordlister ennå. Trykk «Lag ny» for å komme i gang.
            </p>
          ) : (
            <ul className="space-y-3">
              {lists.map((list) => (
                <li
                  key={list.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link
                        href={`/ordlister/${list.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {list.title}
                      </Link>
                      <span className="font-mono text-sm font-bold tracking-[0.2em] text-blue-700">
                        {list.accessCode}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-600">
                      {list.words.length} ord · {list.words.map((w) => w.word).join(', ')}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {list.languages.map((l) => (
                        <span
                          key={l}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Endret {formatDate(list.updatedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyLinkButton code={list.accessCode} label="Del" />
                    <Button asChild variant="outline" size="icon">
                      <Link href={`/ordlister/${list.id}`} aria-label={`Rediger ${list.title}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(list)}
                      aria-label={`Slett ${list.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
