'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { THEMES } from '@/lib/laer-ord/data'
import { wordListStore } from '@/lib/ordlister/db-store'
import { mediaUrl } from '@/lib/ordlister/media'
import type { WordList } from '@/lib/ordlister/types'

const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface WordListOverviewProps {
  isTeacher: boolean
  // Admins can edit every list, not only their own.
  isAdmin: boolean
  userId: string
}

// The first page of «Lær ord»: the user's word lists, then the built-in themes.
export function WordListOverview({ isTeacher, isAdmin, userId }: WordListOverviewProps) {
  const [lists, setLists] = useState<WordList[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    try {
      setLists(await wordListStore.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente ordlistene.')
      setLists([])
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function handleDelete(list: WordList) {
    if (!window.confirm(`Vil du slette ordlisten «${list.title}»? Elevene mister tilgangen.`)) return
    try {
      await wordListStore.remove(list.id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke slette ordlisten.')
    }
  }

  const mine = (lists ?? []).filter((l) => l.createdBy === userId)
  const shared = (lists ?? []).filter((l) => l.createdBy !== userId)

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-white drop-shadow">Lær ord</h1>
        <p className="mt-1 text-white/90 drop-shadow">
          Lær nye ord med bilde, lyd og setninger.
          {isTeacher
            ? ' Lag egne ordlister og del dem med gruppene dine.'
            : ' Her ser du ordlistene læreren har delt med gruppen din.'}
        </p>
      </div>

      <Card className={card}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 pt-6 pb-4">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-gray-900">
              {isTeacher ? 'Mine ordlister' : 'Ordlister fra læreren'}
            </h2>
            <p className="text-sm text-gray-600">
              {isTeacher
                ? 'Elevene i gruppene du deler med, øver på ordene med bilde, lyd og oversettelse til morsmålet sitt.'
                : 'Trykk på en ordliste for å øve. Er listen tom, må du først bli med i gruppen din på siden Grupper.'}
            </p>
          </div>
          {isTeacher && (
            <Button asChild className="shrink-0">
              <Link href="/laer-ord/ny">
                <Plus className="h-4 w-4" /> Lag ny
              </Link>
            </Button>
          )}
        </div>

        <CardContent className="space-y-4 pt-6">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
          {lists === null ? (
            <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Laster …
            </div>
          ) : (
            <>
              {isTeacher && (
                <ListGroup
                  lists={mine}
                  empty="Du har ikke laget noen ordlister ennå. Trykk «Lag ny» for å komme i gang."
                  canEdit
                  onDelete={handleDelete}
                />
              )}
              {(shared.length > 0 || !isTeacher) && (
                <>
                  {isTeacher && (
                    <h3 className="pt-2 text-lg font-semibold text-gray-900">
                      {isAdmin ? 'Andre læreres ordlister' : 'Delt med meg'}
                    </h3>
                  )}
                  <ListGroup
                    lists={shared}
                    empty={
                      isTeacher
                        ? ''
                        : 'Ingen ordlister er delt med deg ennå. Bli med i gruppen din på siden Grupper, så dukker listene opp her.'
                    }
                    canEdit={isAdmin}
                    onDelete={handleDelete}
                  />
                  {!isTeacher && shared.length === 0 && (
                    <Button asChild variant="outline">
                      <Link href="/grupper">Gå til Grupper</Link>
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className={card}>
        <div className="border-b border-gray-200 px-6 pt-6 pb-4">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">Faste temaer</h2>
          <p className="text-sm text-gray-600">Ordlister som alltid er tilgjengelige.</p>
        </div>
        <CardContent className="pt-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((theme) => (
              <li key={theme.id}>
                <Link
                  href={`/laer-ord/${theme.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:bg-blue-50"
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-blue-700" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-900">{theme.navn}</span>
                    <span className="block text-sm text-gray-600">{theme.ord.length} ord</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

function ListGroup({
  lists,
  empty,
  canEdit,
  onDelete,
}: {
  lists: WordList[]
  empty: string
  canEdit: boolean
  onDelete: (list: WordList) => void
}) {
  if (lists.length === 0) return empty ? <p className="text-gray-600">{empty}</p> : null
  return (
    <ul className="space-y-3">
      {lists.map((list) => {
        const ready = list.words.filter((w) => w.content).length
        const pictured = list.words.find((w) => w.media?.img)
        const picture = pictured && mediaUrl(list.id, pictured, 'img')
        return (
          <li
            key={list.id}
            className="group relative flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white sm:h-20 sm:w-20">
              {picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={picture} alt="" loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
                  <BookOpen className="h-1/3 w-1/3 text-blue-900/40" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {/* The link covers the whole box, so a tap anywhere opens the list. */}
              <Link
                href={`/laer-ord/${list.id}`}
                className="text-lg font-semibold text-gray-900 after:absolute after:inset-0 after:rounded-xl after:content-[''] group-hover:text-blue-700"
              >
                {list.title}
              </Link>
              <p className="mt-0.5 truncate text-sm text-gray-600">
                {list.words.length} ord · {list.words.map((w) => w.word).join(', ')}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {list.languages.map((l) => (
                  <span key={l} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {l}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Endret {formatDate(list.updatedAt)}
                {canEdit && list.groupIds.length === 0 && ' · ikke delt med noen gruppe'}
                {canEdit && ready < list.words.length && ` · ${ready} av ${list.words.length} ord er klare`}
              </p>
            </div>
            {canEdit && (
              // Above the covering link, so these buttons still work.
              <div className="relative z-10 flex shrink-0 items-center gap-2">
                <Button asChild variant="outline" size="icon">
                  <Link href={`/laer-ord/${list.id}/rediger`} aria-label={`Rediger ${list.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(list)}
                  aria-label={`Slett ${list.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
