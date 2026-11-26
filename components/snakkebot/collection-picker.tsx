'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle, Pencil, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import type { PublicCollection } from '@/lib/snakkebot/types'

interface CollectionPickerProps {
  userEmail: string | null
  isAdmin: boolean
  collection: PublicCollection
  // how the collection was opened (id or code); the cases keep it in the address
  collectionRef: string
  editHref: string | null
  showCode: boolean
}

// The student sees the teacher's text and picks a case, or a random one.
export function CollectionPicker({ userEmail, isAdmin, collection, collectionRef, editHref, showCode }: CollectionPickerProps) {
  const router = useRouter()
  const base = `/snakkebot/samling/${collectionRef}`

  function pickRandom() {
    const bot = collection.bots[Math.floor(Math.random() * collection.bots.length)]
    if (bot) router.push(`${base}/${bot.id}`)
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        backHref="/snakkebot"
        backLabel="Snakkebot"
        title={collection.name}
        description={collection.description || 'Velg hvem du vil snakke med.'}
        actions={
          <>
            {showCode && (
              <span className="rounded-md bg-white/90 px-3 py-1.5 text-sm text-gray-700">
                Kode <span className="font-mono font-bold tracking-[0.2em] text-gray-900">{collection.accessCode}</span>
              </span>
            )}
            {editHref && (
              <Button asChild variant="outline">
                <Link href={editHref}>
                  <Pencil className="h-4 w-4" /> Rediger
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardContent className="space-y-6 pt-6">
          {collection.goals && (
            <section className="rounded-xl border border-gray-200 bg-vlfk-surface-muted px-4 py-4">
              <h2 className="mb-2 text-base font-semibold text-gray-900">Om øvingen</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{collection.goals}</p>
            </section>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">Hvem vil du snakke med?</h2>
            <Button onClick={pickRandom} disabled={collection.bots.length === 0}>
              <Shuffle className="h-4 w-4" /> Tilfeldig
            </Button>
          </div>

          {collection.bots.length === 0 ? (
            <p className="text-gray-600">Samlingen har ingen snakkeboter ennå.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {collection.bots.map((bot, index) => (
                <li key={bot.id}>
                  <Link
                    href={`${base}/${bot.id}`}
                    className="flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-vlfk-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vlfk-ink"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vlfk-mint text-sm font-semibold text-vlfk-ink">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-vlfk-ink">{bot.name}</span>
                      {bot.description && <span className="mt-0.5 block text-sm text-gray-600">{bot.description}</span>}
                    </span>
                    <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
