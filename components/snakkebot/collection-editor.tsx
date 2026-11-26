'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { groupStore } from '@/lib/ordlister/db-store'
import type { Group } from '@/lib/ordlister/types'
import { collectionStore, type ChatbotOption } from '@/lib/snakkebot/collection-store'
import { LIMITS, type ChatbotCollection } from '@/lib/snakkebot/types'

interface CollectionEditorProps {
  userEmail: string | null
  isAdmin: boolean
  collectionId?: string
}

// «Samling»: several chatbots (cases) the student picks from, with the
// teacher's text about how to do it and what to practise.
export function CollectionEditor({ userEmail, isAdmin, collectionId }: CollectionEditorProps) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(!collectionId)
  const [missing, setMissing] = useState(false)
  const [saved, setSaved] = useState<ChatbotCollection | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [chatbotIds, setChatbotIds] = useState<string[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [bots, setBots] = useState<ChatbotOption[] | null>(null)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void groupStore
      .list()
      .then((all) => setGroups(all.filter((g) => g.isOwner || g.accessCode !== null)))
      .catch(() => setGroups([]))
    void collectionStore
      .chatbots()
      .then(setBots)
      .catch(() => setBots([]))
  }, [])

  useEffect(() => {
    if (!collectionId) return
    let cancelled = false
    collectionStore
      .get(collectionId)
      .then((c) => {
        if (cancelled) return
        if (!c) return setMissing(true)
        setSaved(c)
        setName(c.name)
        setDescription(c.description)
        setGoals(c.goals)
        setChatbotIds(c.chatbotIds)
        setGroupIds(c.groupIds)
      })
      .catch(() => !cancelled && setMissing(true))
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [collectionId])

  function toggleBot(id: string) {
    setChatbotIds((current) => {
      if (current.includes(id)) return current.filter((b) => b !== id)
      if (current.length >= LIMITS.collectionBots) return current
      return [...current, id]
    })
  }

  function move(index: number, by: number) {
    setChatbotIds((current) => {
      const next = [...current]
      const target = index + by
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function toggleGroup(id: string) {
    setGroupIds((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]))
  }

  async function handleSave(openAfter: boolean) {
    if (!name.trim()) return setError('Gi samlingen et navn.')
    if (chatbotIds.length < 2) return setError('Velg minst to snakkeboter til samlingen.')
    setError(null)
    setSaving(true)
    try {
      const id = await collectionStore.save({
        id: saved?.id,
        name: name.trim(),
        description: description.trim(),
        goals: goals.trim(),
        chatbotIds,
        groupIds,
      })
      router.push(openAfter ? `/snakkebot/samling/${id}` : '/snakkebot')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre samlingen.')
      setSaving(false)
    }
  }

  const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'
  const botById = new Map((bots ?? []).map((b) => [b.id, b]))

  if (!loaded || missing) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
            {missing ? (
              <span>Fant ikke samlingen. Den kan være slettet.</span>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Laster samlingen …
              </>
            )}
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        backHref="/snakkebot"
        backLabel="Alle snakkeboter"
        title={saved ? 'Rediger samling' : 'Lag ny samling'}
        description="Sett sammen flere snakkeboter til én øving. Elevene ser ett kort og velger selv hvem de vil snakke med, eller får en tilfeldig."
      />

      <Card className={card}>
        <CardContent className="space-y-6 pt-6">
          {saved && (
            <p className="rounded-xl border border-gray-200 bg-vlfk-surface-muted px-4 py-3 text-sm text-gray-700">
              Elevene kan åpne samlingen med koden{' '}
              <span className="font-mono text-base font-bold tracking-[0.25em] text-gray-900">{saved.accessCode}</span>{' '}
              på Snakkebot-siden, uten å logge inn.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="col-name" className="text-base font-semibold text-gray-900">
              Navn
            </Label>
            <Input
              id="col-name"
              value={name}
              maxLength={LIMITS.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For eksempel «Kundeveiledning»"
              className="bg-white text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="col-description" className="text-base font-semibold text-gray-900">
              Kort beskrivelse <span className="font-normal text-gray-500">(valgfri)</span>
            </Label>
            <Input
              id="col-description"
              value={description}
              maxLength={LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="For eksempel «Hjelp kunder i butikken»"
              className="bg-white text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="col-goals" className="text-base font-semibold text-gray-900">
              Til eleven: instruksjoner og læringsmål <span className="font-normal text-gray-500">(valgfri)</span>
            </Label>
            <p className="text-sm text-gray-600">
              Hva skal eleven gjøre, og hva skal eleven øve på? Eleven ser teksten før casen velges. Snakkebotene får den
              også, så de kan hjelpe eleven å øve på målene.
            </p>
            <Textarea
              id="col-goals"
              value={goals}
              maxLength={LIMITS.goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder={
                'For eksempel:\nDu jobber i en butikk. Kundene har ulike behov og noen er misfornøyde.\n\nLæringsmål:\n- Hilse og spørre hva kunden trenger\n- Forklare og gi råd med enkle ord\n- Være høflig også når kunden er sint'
              }
              className="min-h-[160px] bg-white text-base md:text-sm"
            />
            <p className="text-right text-xs tabular-nums text-gray-400">
              {goals.length}/{LIMITS.goals}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Snakkeboter i samlingen</p>
            <p className="text-sm text-gray-600">
              Hver snakkebot er én case, med sin egen instruks og stemme. Velg minst to, høyst {LIMITS.collectionBots}.
              Rekkefølgen er den elevene ser.{' '}
              <Link href="/snakkebot/ny" className="font-medium text-vlfk-ink hover:underline">
                Lag en ny snakkebot
              </Link>
            </p>

            {chatbotIds.length > 0 && (
              <ol className="space-y-2">
                {chatbotIds.map((id, index) => (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-vlfk-ink bg-vlfk-surface-muted px-3 py-2"
                  >
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-gray-500">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{botById.get(id)?.name ?? 'Ukjent snakkebot'}</span>
                      {botById.get(id)?.description && (
                        <span className="block truncate text-xs text-gray-600">{botById.get(id)?.description}</span>
                      )}
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Flytt opp">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(index, 1)}
                      disabled={index === chatbotIds.length - 1}
                      aria-label="Flytt ned"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => toggleBot(id)} aria-label="Fjern fra samlingen">
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}

            {bots === null ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Henter snakkebotene …
              </p>
            ) : bots.filter((b) => !chatbotIds.includes(b.id)).length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {bots
                  .filter((b) => !chatbotIds.includes(b.id))
                  .map((bot) => (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => toggleBot(bot.id)}
                      disabled={chatbotIds.length >= LIMITS.collectionBots}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:border-vlfk-ink disabled:opacity-50"
                    >
                      + {bot.name}
                    </button>
                  ))}
              </div>
            ) : bots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600">
                Det finnes ingen snakkeboter ennå. Lag snakkebotene først, og sett dem sammen her etterpå.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Del med grupper</p>
            <p className="text-sm text-gray-600">
              Elevene i gruppene du velger, finner samlingen på Snakkebot-siden når de er logget inn. Alle med koden kan
              også åpne den.
            </p>
            {groups === null ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Henter gruppene dine …
              </p>
            ) : groups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600">
                Du har ingen grupper ennå. Elevene kan bruke koden i stedet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const checked = groupIds.includes(group.id)
                  return (
                    <label
                      key={group.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        checked
                          ? 'border-vlfk-ink bg-vlfk-ink text-white'
                          : 'border-gray-300 bg-white text-gray-800 hover:border-vlfk-ink'
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleGroup(group.id)} />
                      {group.name}
                      <span className={checked ? 'text-white/80' : 'text-gray-500'}>({group.memberCount})</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5">
            <Button type="button" onClick={() => void handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lagre og vis
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleSave(false)} disabled={saving}>
              Lagre
            </Button>
          </div>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
