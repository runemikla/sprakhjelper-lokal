'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Theme, Word } from '@/lib/laer-ord/data'
import { cn } from '@/lib/utils'
import { PronunciationProvider } from '@/components/laer-ord/pronunciation'
import { store } from '@/components/laer-ord/shared'
import { WordList } from '@/components/laer-ord/word-list'
import { PickWord } from '@/components/laer-ord/pick-word'
import { ListenPick } from '@/components/laer-ord/listen-pick'
import { ListenWrite } from '@/components/laer-ord/listen-write'
import { MatchSentences } from '@/components/laer-ord/match-sentences'
import { Flashcards } from '@/components/laer-ord/flashcards'
import { wordListStore } from '@/lib/ordlister/db-store'
import { listWords } from '@/lib/ordlister/to-words'
import type { WordList as TeacherWordList } from '@/lib/ordlister/types'

const ACTIVITIES: {
  key: string
  label: string
  component: ComponentType<{ words: Word[] }>
}[] = [
  { key: 'ord', label: 'Ordliste', component: WordList },
  { key: 'bilde', label: 'Velg riktig ord', component: PickWord },
  { key: 'lytt', label: 'Lytt og velg', component: ListenPick },
  { key: 'skriv', label: 'Hør og skriv', component: ListenWrite },
  { key: 'match', label: 'Match ord og setning', component: MatchSentences },
  { key: 'kort', label: 'Flashcards', component: Flashcards },
]

function activityFromHash() {
  const key = globalThis.location?.hash.slice(1)
  return ACTIVITIES.find((a) => a.key === key) ?? ACTIVITIES[0]
}

interface ExercisesProps {
  userEmail?: string | null
  isAdmin?: boolean
  // Teachers and admins get a link to the editor for a teacher's list.
  canEdit?: boolean
  // One of these: a built-in theme, or the id of a teacher's list.
  theme?: Theme
  listId?: string
}

export function Exercises({ userEmail = null, isAdmin = false, canEdit = false, theme, listId }: ExercisesProps) {
  // Exercises are shuffled and read localStorage, so they render only in the
  // browser to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false)
  const [activity, setActivity] = useState(ACTIVITIES[0])
  const [list, setList] = useState<TeacherWordList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('')

  useEffect(() => {
    setLanguage(store.get('sprak', ''))
    setActivity(activityFromHash())
    setMounted(true)

    const onHashChange = () => setActivity(activityFromHash())
    globalThis.addEventListener('hashchange', onHashChange)
    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    wordListStore
      .get(listId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) setError('Fant ikke ordlisten. Den kan være slettet, eller den er ikke delt med gruppen din.')
        else setList(loaded)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Kunne ikke hente ordlisten.')
      })
    return () => {
      cancelled = true
    }
  }, [listId])

  const listLanguage = list ? (list.languages.includes(language) ? language : list.languages[0] ?? '') : ''
  const words = useMemo(
    () => (theme ? theme.ord : list ? listWords(list, listLanguage) : null),
    [theme, list, listLanguage]
  )
  const title = theme?.navn ?? list?.title ?? 'Lær ord'
  const Exercise = activity.component

  return (
    <div className="relative min-h-screen">
      {/* Background image with overlay (matches the other tools) */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/Aurlandsfjorden-blaa.jpg"
          alt="Aurlandsfjorden bakgrunn"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-cyan-700/50" />
        <div className="absolute bottom-4 right-4 z-10 rounded bg-black/20 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm">
          Foto: Silje Alvsaker / Vestland fylkeskommune
        </div>
      </div>

      <Navbar userEmail={userEmail} isAdmin={isAdmin} />

      <div className="relative z-10 container mx-auto px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/laer-ord"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Alle ordlister
          </Link>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {list && list.languages.length > 0 && (
                <label className="flex items-center gap-2 text-sm font-semibold text-white">
                  Mitt språk
                  <select
                    value={listLanguage}
                    onChange={(event) => {
                      setLanguage(event.target.value)
                      store.set('sprak', event.target.value)
                    }}
                    className="rounded-lg border border-white/40 bg-white px-3 py-2 text-base font-medium text-gray-900 shadow"
                  >
                    {list.languages.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {list && canEdit && (
                <Button asChild variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link href={`/laer-ord/${list.id}/rediger`}>
                    <Pencil className="h-4 w-4" /> Rediger
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Activity tabs */}
          <nav aria-label="Øvelser" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2">
              {ACTIVITIES.map((a) => (
                <a
                  key={a.key}
                  href={`#${a.key}`}
                  aria-current={a.key === activity.key ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                    a.key === activity.key
                      ? 'border-white bg-white text-blue-700 shadow'
                      : 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {a.label}
                </a>
              ))}
            </div>
          </nav>

          <Card className="border-white/20 bg-white/95 shadow-xl backdrop-blur-sm">
            <CardContent className="pt-6">
              {error ? (
                <div className="space-y-4">
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/laer-ord">Tilbake til ordlistene</Link>
                  </Button>
                </div>
              ) : mounted && words && words.length > 0 ? (
                <PronunciationProvider>
                  <Exercise key={`${theme?.id ?? listId}-${listLanguage}-${activity.key}`} words={words} />
                </PronunciationProvider>
              ) : mounted && words && words.length === 0 ? (
                <p className="py-10 text-center text-gray-600">
                  Ordlisten har ingen ferdige ord ennå. {canEdit ? 'Åpne «Rediger» og lag øvelsene.' : 'Prøv igjen litt senere.'}
                </p>
              ) : (
                <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Laster ordene …
                </div>
              )}
            </CardContent>
          </Card>

          {words && (
            <p className="mt-4 text-sm text-white/80 drop-shadow">
              {words.length} ord i {list ? 'ordlisten' : 'temaet'} «{title}».
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
