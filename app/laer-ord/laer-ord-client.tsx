'use client'

import { useEffect, useState, type ComponentType } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { THEMES, type Word } from '@/lib/laer-ord/data'
import { cn } from '@/lib/utils'
import { PronunciationProvider } from '@/components/laer-ord/pronunciation'
import { store } from '@/components/laer-ord/shared'
import { WordList } from '@/components/laer-ord/word-list'
import { PickWord } from '@/components/laer-ord/pick-word'
import { ListenPick } from '@/components/laer-ord/listen-pick'
import { ListenWrite } from '@/components/laer-ord/listen-write'
import { MatchSentences } from '@/components/laer-ord/match-sentences'
import { Flashcards } from '@/components/laer-ord/flashcards'
import { JoinWordListForm } from '@/components/ordlister/join-form'
import { wordListStore } from '@/lib/ordlister/local-store'
import { loadListWords } from '@/lib/ordlister/to-words'
import type { WordList as TeacherWordList } from '@/lib/ordlister/types'

// Competence goals (kompetansemål) that each activity trains.
const GOALS: Record<number, string> = {
  1: 'strategier for språklæring',
  2: 'språklyder og uttale',
  3: 'likheter med andre språk',
  4: 'rettskriving og grammatikk',
  5: 'digitale ressurser',
  7: 'hverdagslige og faglige ord',
  9: 'lese svært enkle tekster',
  14: 'grammatiske strukturer',
}

const ACTIVITIES: {
  key: string
  label: string
  goals: number[]
  component: ComponentType<{ words: Word[] }>
}[] = [
  { key: 'ord', label: 'Ordliste', goals: [2, 5, 7], component: WordList },
  { key: 'bilde', label: 'Velg riktig ord', goals: [5, 7], component: PickWord },
  { key: 'lytt', label: 'Lytt og velg', goals: [2, 7], component: ListenPick },
  { key: 'skriv', label: 'Hør og skriv', goals: [2, 4], component: ListenWrite },
  { key: 'match', label: 'Match ord og setning', goals: [7, 9, 14], component: MatchSentences },
  { key: 'kort', label: 'Flashcards', goals: [1, 2, 3, 7], component: Flashcards },
]

function activityFromHash() {
  const key = globalThis.location?.hash.slice(1)
  return ACTIVITIES.find((a) => a.key === key) ?? ACTIVITIES[0]
}

interface LaerOrdClientProps {
  userEmail?: string | null
  // Forwarded to the navbar so admins see the "Instrukser" menu entry.
  isAdmin?: boolean
}

export default function LaerOrdClient({ userEmail = null, isAdmin = false }: LaerOrdClientProps) {
  // Exercises are shuffled and read localStorage, so they render only in the
  // browser to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false)
  const [themeId, setThemeId] = useState(THEMES[0].id)
  const [activity, setActivity] = useState(ACTIVITIES[0])
  // Teachers' word lists («Ordlister»). Stored in this browser until the
  // database is connected.
  const [lists, setLists] = useState<TeacherWordList[]>([])
  const [missingCode, setMissingCode] = useState<string | null>(null)
  const [language, setLanguage] = useState('')
  const [listWords, setListWords] = useState<Word[] | null>(null)

  useEffect(() => {
    const all = wordListStore.list().filter((l) => l.words.some((w) => w.content))
    setLists(all)
    const code = new URLSearchParams(globalThis.location.search).get('liste')?.toUpperCase()
    const ids = [...THEMES.map((t) => t.id), ...all.map((l) => `liste:${l.accessCode}`)]
    if (code) {
      if (all.some((l) => l.accessCode === code)) setThemeId(`liste:${code}`)
      else setMissingCode(code)
    } else {
      const saved = store.get('tema', THEMES[0].id)
      if (ids.includes(saved)) setThemeId(saved)
    }
    setLanguage(store.get('sprak', ''))
    setActivity(activityFromHash())
    setMounted(true)

    const onHashChange = () => setActivity(activityFromHash())
    globalThis.addEventListener('hashchange', onHashChange)
    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [])

  const teacherList = themeId.startsWith('liste:')
    ? lists.find((l) => `liste:${l.accessCode}` === themeId)
    : undefined
  const listLanguage =
    teacherList && (teacherList.languages.includes(language) ? language : teacherList.languages[0] ?? '')

  useEffect(() => {
    if (!teacherList) {
      setListWords(null)
      return
    }
    let release: (() => void) | undefined
    let cancelled = false
    setListWords(null)
    void loadListWords(teacherList, listLanguage ?? '').then((loaded) => {
      if (cancelled) return loaded.release()
      release = loaded.release
      setListWords(loaded.words)
    })
    return () => {
      cancelled = true
      release?.()
    }
  }, [teacherList, listLanguage])

  const builtIn = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
  const theme = teacherList
    ? { id: themeId, navn: teacherList.title, ord: listWords ?? [] }
    : builtIn
  const wordsReady = !teacherList || listWords !== null
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
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-white drop-shadow">Lær ord</h1>
              <p className="text-white/90 drop-shadow">
                Lær nye ord med bilde, lyd og setninger. Trykk på et ord for å høre det.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              Tema
              <select
                value={theme.id}
                onChange={(event) => {
                  setThemeId(event.target.value)
                  setMissingCode(null)
                  store.set('tema', event.target.value)
                  if (globalThis.location.search) {
                    globalThis.history.replaceState(null, '', `/laer-ord${globalThis.location.hash}`)
                  }
                }}
                className="rounded-lg border border-white/40 bg-white px-3 py-2 text-base font-medium text-gray-900 shadow"
              >
                <optgroup label="Temaer">
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.navn}
                    </option>
                  ))}
                </optgroup>
                {lists.length > 0 && (
                  <optgroup label="Ordlister fra læreren">
                    {lists.map((l) => (
                      <option key={l.id} value={`liste:${l.accessCode}`}>
                        {l.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            {teacherList && teacherList.languages.length > 0 && (
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
                  {teacherList.languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
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

          <p className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-white/90">
            Kompetansemål:
            {activity.goals.map((n) => (
              <span key={n} className="rounded-md bg-white/15 px-2 py-0.5 text-white">
                <b>{n}</b> {GOALS[n]}
              </span>
            ))}
          </p>

          <Card className="border-white/20 bg-white/95 shadow-xl backdrop-blur-sm">
            <CardContent className="pt-6">
              {missingCode && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Fant ingen ordliste med koden <b className="font-mono">{missingCode}</b>. Ordlistene
                  lagres foreløpig bare i nettleseren der de ble laget, så koden virker bare der til
                  databasen er koblet til.
                </p>
              )}
              {mounted && wordsReady && theme.ord.length > 0 ? (
                <PronunciationProvider>
                  <Exercise key={`${theme.id}-${listLanguage ?? ''}-${activity.key}`} words={theme.ord} />
                </PronunciationProvider>
              ) : (
                <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Laster ordene …
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-sm text-white/80 drop-shadow">
            {theme.ord.length} ord i {teacherList ? 'ordlisten' : 'temaet'} «{theme.navn}».
          </p>

          <JoinWordListForm />
        </div>
      </div>
    </div>
  )
}
