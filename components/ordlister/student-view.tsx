'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { PreviewNotice } from '@/components/ordlister/preview-notice'
import { wordListStore } from '@/lib/ordlister/local-store'
import type { WordList } from '@/lib/ordlister/types'

interface StudentViewProps {
  code: string
  userEmail?: string | null
  isAdmin?: boolean
}

// What a student sees after opening a shared list. Images, sound and
// translations will be generated once the database is connected.
export function StudentView({ code, userEmail = null, isAdmin = false }: StudentViewProps) {
  const [list, setList] = useState<WordList | null | undefined>(undefined)
  const [language, setLanguage] = useState('')

  useEffect(() => {
    const found = wordListStore.getByCode(code) ?? null
    setList(found)
    if (found) setLanguage(found.languages[0] ?? '')
  }, [code])

  const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

  if (list === undefined) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Laster ordlisten …
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  if (list === null) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="space-y-4 pt-6">
            <p className="text-gray-700">
              Fant ingen ordliste med koden <b className="font-mono">{code}</b>. Sjekk koden med
              læreren din.
            </p>
            <PreviewNotice />
            <Button asChild variant="outline">
              <Link href="/laer-ord">Til Lær ord</Link>
            </Button>
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            Ordliste fra læreren
          </p>
          <h1 className="text-3xl font-bold text-white drop-shadow">{list.title}</h1>
          <p className="mt-1 text-white/90 drop-shadow">{list.words.length} ord å lære</p>
        </div>
        {list.languages.length > 0 && (
          <label className="flex items-center gap-2 text-sm font-semibold text-white">
            Mitt språk
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
      </div>

      <Card className={card}>
        <CardContent className="space-y-4 pt-6">
          <PreviewNotice />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {list.words.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 text-center text-blue-900/60">
                  <ImageIcon className="h-8 w-8" aria-hidden="true" />
                  <span className="text-xs">Bildet lages av KI</span>
                </div>
                <div className="px-3 py-2">
                  <p className="text-lg font-semibold text-gray-900">{item.word}</p>
                  <p className="text-sm italic text-gray-400">
                    Oversettelse til {language.toLowerCase()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
