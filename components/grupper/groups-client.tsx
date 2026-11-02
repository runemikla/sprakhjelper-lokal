'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Loader2, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { groupStore } from '@/lib/ordlister/db-store'
import type { Group } from '@/lib/ordlister/types'

const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

interface GroupsClientProps {
  isTeacher: boolean
  isAdmin: boolean
}

export function GroupsClient({ isTeacher, isAdmin }: GroupsClientProps) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    try {
      setGroups(await groupStore.list())
      setError(null)
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke hente gruppene.'))
      setGroups([])
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const own = (groups ?? []).filter((g) => g.isOwner)
  const member = (groups ?? []).filter((g) => g.isMember && !g.isOwner)
  const others = (groups ?? []).filter((g) => !g.isOwner && !g.isMember)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow">Grupper</h1>
          <p className="mt-1 text-white/90 drop-shadow">
            {isTeacher
              ? 'Lag en gruppe for klassen din og gi elevene tilgangskoden. Ordlister i Lær ord deles med gruppene.'
              : 'Bli med i gruppen din med koden fra læreren. Da ser du ordlistene som er delt med gruppen i Lær ord.'}
          </p>
        </div>
        <Button asChild className="shrink-0 bg-white text-gray-900 shadow hover:bg-gray-100">
          <Link href="/grupper/ny">
            <Plus className="h-4 w-4" /> Ny gruppe
          </Link>
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {groups === null ? (
        <Card className={card}>
          <CardContent className="flex items-center justify-center gap-3 py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Laster …
          </CardContent>
        </Card>
      ) : (
        <>
          {isTeacher && (
            <GroupSection
              title="Mine grupper"
              empty="Du har ikke laget noen grupper ennå. Trykk «Ny gruppe» for å lage en."
              groups={own}
              manage
              onChanged={reload}
            />
          )}
          {(member.length > 0 || !isTeacher) && (
            <GroupSection
              title="Grupper jeg er med i"
              empty="Du er ikke med i noen grupper ennå. Trykk «Ny gruppe» og skriv inn koden fra læreren."
              groups={member}
              onChanged={reload}
            />
          )}
          {isAdmin && others.length > 0 && (
            <GroupSection
              title="Alle andre grupper"
              empty=""
              groups={others}
              manage
              onChanged={reload}
            />
          )}
        </>
      )}
    </>
  )
}

interface GroupSectionProps {
  title: string
  empty: string
  groups: Group[]
  // Owners and admins: show the code and members, allow delete.
  manage?: boolean
  onChanged: () => Promise<void>
}

function GroupSection({ title, empty, groups, manage = false, onChanged }: GroupSectionProps) {
  return (
    <Card className={card}>
      <div className="border-b border-gray-200 px-6 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <CardContent className="pt-6">
        {groups.length === 0 ? (
          <p className="text-gray-600">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <GroupRow key={group.id} group={group} manage={manage} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function GroupRow({ group, manage, onChanged }: { group: Group; manage: boolean; onChanged: () => Promise<void> }) {
  const [copied, setCopied] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<{ userId: string; email: string | null; joinedAt: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function loadMembers() {
    try {
      setMembers(await groupStore.members(group.id))
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke hente medlemmene.'))
    }
  }

  async function toggleMembers() {
    const next = !showMembers
    setShowMembers(next)
    if (next && members === null) await loadMembers()
  }

  async function handleDelete() {
    if (!window.confirm(`Vil du slette gruppen «${group.name}»? Elevene mister tilgangen til ordlistene som er delt med den.`)) return
    try {
      await groupStore.remove(group.id)
      await onChanged()
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke slette gruppen.'))
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Vil du melde deg ut av «${group.name}»?`)) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data } = await createClient().auth.getUser()
      if (data.user) await groupStore.removeMember(group.id, data.user.id)
      await onChanged()
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke melde deg ut.'))
    }
  }

  async function handleRemoveMember(userId: string, email: string | null) {
    if (!window.confirm(`Vil du fjerne ${email ?? 'medlemmet'} fra gruppen?`)) return
    try {
      await groupStore.removeMember(group.id, userId)
      await loadMembers()
      await onChanged()
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke fjerne medlemmet.'))
    }
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900">{group.name}</p>
          <p className="mt-0.5 text-sm text-gray-600">
            {group.memberCount} {group.memberCount === 1 ? 'medlem' : 'medlemmer'}
            {group.ownerEmail && !group.isOwner && <> · laget av {group.ownerEmail}</>}
            {' · '}
            {formatDate(group.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {manage && group.accessCode && (
            <>
              <span className="font-mono text-xl font-bold tracking-[0.25em] text-blue-700">
                {group.accessCode}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Kopier koden"
                onClick={() => {
                  void navigator.clipboard?.writeText(group.accessCode ?? '').then(() => setCopied(true))
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" onClick={toggleMembers} aria-expanded={showMembers}>
                <Users className="h-4 w-4" /> Medlemmer
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                aria-label={`Slett ${group.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {!manage && (
            <Button type="button" variant="outline" onClick={handleLeave}>
              Meld meg ut
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {manage && showMembers && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {members === null ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Henter medlemmer …
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-600">
              Ingen har blitt med ennå. Gi elevene koden <b className="font-mono">{group.accessCode}</b> og
              be dem skrive den inn på denne siden.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="truncate text-gray-800">{m.email ?? m.userId}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 hover:underline"
                    onClick={() => handleRemoveMember(m.userId, m.email)}
                  >
                    Fjern
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
