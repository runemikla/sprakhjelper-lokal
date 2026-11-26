'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { collectionStore } from '@/lib/snakkebot/collection-store'
import { chatbotStore } from '@/lib/snakkebot/db-store'

export interface ChatbotListItem {
  // a collection («Samling») opens a list of cases instead of a conversation
  kind?: 'bot' | 'collection'
  // number of chatbots in a collection
  caseCount?: number
  id: string
  name: string
  description: string
  accessCode: string
  level: string | null
  groupCount: number
  canManage: boolean
  // Teachers see the code so they can give it to their students.
  showCode?: boolean
}

// The teacher's chatbots (with code, edit and delete), or the chatbots a
// student's groups have been given.
export function ChatbotList({ items, emptyText }: { items: ChatbotListItem[]; emptyText: React.ReactNode }) {
  const router = useRouter()
  const [bots, setBots] = useState(items)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(bot: ChatbotListItem) {
    const what = bot.kind === 'collection' ? 'samlingen' : 'snakkeboten'
    const extra = bot.kind === 'collection' ? ' Snakkebotene i den blir ikke slettet.' : ''
    if (!window.confirm(`Vil du slette ${what} «${bot.name}»?${extra} Dette kan ikke angres.`)) return
    setDeletingId(bot.id)
    setError(null)
    try {
      if (bot.kind === 'collection') await collectionStore.remove(bot.id)
      else await chatbotStore.remove(bot.id)
      setBots((current) => current.filter((b) => b.id !== bot.id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setDeletingId(null)
    }
  }

  if (bots.length === 0) return <p className="text-gray-600">{emptyText}</p>

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      <ul className="space-y-3">
        {bots.map((bot) => {
          const href = bot.kind === 'collection' ? `/snakkebot/samling/${bot.id}` : `/snakkebot/${bot.id}`
          return (
          <li
            key={bot.id}
            className="relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-vlfk-ink sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Link
                href={href}
                className="text-lg font-semibold text-vlfk-ink after:absolute after:inset-0 focus-visible:outline-none"
              >
                {bot.name}
              </Link>
              {bot.kind === 'collection' && (
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Samling · {bot.caseCount ?? 0} {bot.caseCount === 1 ? 'case' : 'caser'}
                </p>
              )}
              {bot.description && <p className="mt-0.5 text-sm text-gray-600">{bot.description}</p>}
              {(bot.canManage || bot.showCode) && (
                <p className="mt-1 text-xs text-gray-500">
                  Kode <span className="font-mono font-bold tracking-[0.2em] text-gray-900">{bot.accessCode}</span>
                  {bot.level ? ` · ${bot.level}` : ''}
                  {bot.canManage
                    ? ` · ${bot.groupCount === 0 ? 'ikke delt med grupper' : bot.groupCount === 1 ? 'delt med 1 gruppe' : `delt med ${bot.groupCount} grupper`}`
                    : ''}
                </p>
              )}
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-2">
              <Button asChild size="sm">
                <Link href={href}>
                  <MessageCircle className="h-4 w-4" /> {bot.kind === 'collection' ? 'Velg' : 'Snakk'}
                </Link>
              </Button>
              {bot.canManage && (
                <>
                  <Button asChild variant="outline" size="icon">
                    <Link href={`${href}/rediger`} aria-label={`Rediger ${bot.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => void handleDelete(bot)}
                    disabled={deletingId === bot.id}
                    aria-label={`Slett ${bot.name}`}
                  >
                    {deletingId === bot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
          </li>
          )
        })}
      </ul>
    </>
  )
}
