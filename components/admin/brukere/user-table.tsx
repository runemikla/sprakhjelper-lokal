'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Filter, GraduationCap, Search, ShieldCheck, UserRound, Users } from 'lucide-react'
import { setUserRole } from '@/app/admin/brukere/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// «Brukere»: every account with its role, in the card and table layout of
// the Dashboard 5 block. An admin can change other users' roles here.

export type Role = 'student' | 'teacher' | 'admin'

export interface AdminUser {
  id: string
  email: string
  firstName: string | null
  role: Role
  createdAt: string
  lastSignInAt: string | null
  confirmed: boolean
  groupCount: number
}

const ROLE_LABELS: Record<Role, string> = { student: 'Elev', teacher: 'Lærer', admin: 'Admin' }
// One profile colour per role, used as a surface with ink text.
const ROLE_COLORS: Record<Role, string> = {
  student: 'bg-vlfk-lyseblaa',
  teacher: 'bg-vlfk-lysegronn',
  admin: 'bg-vlfk-gul',
}

const dateFormatter = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' })
const formatDate = (value: string | null) => (value ? dateFormatter.format(new Date(value)) : '–')

function StatsCards({ users }: { users: AdminUser[] }) {
  const count = (role: Role) => users.filter((u) => u.role === role).length
  const stats = [
    { title: 'Brukere', icon: Users, value: users.length, color: 'bg-vlfk-surface-muted' },
    { title: 'Elever', icon: UserRound, value: count('student'), color: ROLE_COLORS.student },
    { title: 'Lærere', icon: GraduationCap, value: count('teacher'), color: ROLE_COLORS.teacher },
    { title: 'Administratorer', icon: ShieldCheck, value: count('admin'), color: ROLE_COLORS.admin },
  ]
  return (
    <div className="rounded-xl border bg-white">
      <div className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-r-0">
        {stats.map((stat) => (
          <div key={stat.title} className="space-y-3 p-4 sm:p-6">
            <div className="flex items-center gap-2 text-vlfk-ink-muted">
              <span className={cn('flex size-7 items-center justify-center rounded-md text-vlfk-ink', stat.color)}>
                <stat.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium sm:text-sm">{stat.title}</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-vlfk-ink tabular-nums sm:text-[28px]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleSelect({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [role, setRole] = React.useState<Role>(user.role)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => setRole(user.role), [user.role])

  if (isSelf) {
    return (
      <span className="flex items-center gap-2">
        <span className={cn('rounded-sm px-2 py-1 text-xs font-medium text-vlfk-ink', ROLE_COLORS[role])}>
          {ROLE_LABELS[role]}
        </span>
        <span className="text-xs text-vlfk-ink-muted">(deg)</span>
      </span>
    )
  }

  const change = (next: Role) => {
    if (next === role) return
    if (next === 'admin' && !window.confirm(`Gjøre ${user.email} til administrator? Administratorer kan endre alt i admin.`)) {
      return
    }
    const previous = role
    setRole(next)
    setError(null)
    startTransition(async () => {
      const result = await setUserRole({ userId: user.id, role: next })
      if (!result.ok) {
        setRole(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-1">
      <Select value={role} onValueChange={(value) => change(value as Role)} disabled={pending}>
        <SelectTrigger className="h-8 w-[110px] text-xs sm:text-sm" aria-label={`Rolle for ${user.email}`}>
          <span className="flex items-center gap-2">
            <span className={cn('size-2.5 shrink-0 rounded-full', ROLE_COLORS[role])} aria-hidden="true" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-vlfk-ink">{error}</p>}
    </div>
  )
}

export function UserTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [query, setQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<Role | 'alle'>('alle')
  const [page, setPage] = React.useState(1)
  const pageSize = 15

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(
      (u) =>
        (roleFilter === 'alle' || u.role === roleFilter) &&
        (!q || u.email.toLowerCase().includes(q) || (u.firstName ?? '').toLowerCase().includes(q))
    )
  }, [users, query, roleFilter])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize)
  React.useEffect(() => setPage(1), [query, roleFilter])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-vlfk-ink sm:text-2xl">Brukere</h2>
        <p className="max-w-3xl text-sm text-vlfk-ink-muted sm:text-base">
          Alle som har konto i Språkhjelp. Endre rollen i menyen på raden; endringen gjelder neste gang brukeren
          åpner en side. Du kan ikke endre din egen rolle.
        </p>
      </div>

      <StatsCards users={users} />

      <div className="rounded-xl border bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-6">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-vlfk-ink-muted" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk på e-post eller navn"
              aria-label="Søk etter bruker"
              className="h-9 pl-9 text-base sm:text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-9 gap-1.5">
                <Filter className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{roleFilter === 'alle' ? 'Alle roller' : ROLE_LABELS[roleFilter]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Vis rolle</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={roleFilter === 'alle'} onCheckedChange={() => setRoleFilter('alle')}>
                Alle roller
              </DropdownMenuCheckboxItem>
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <DropdownMenuCheckboxItem key={r} checked={roleFilter === r} onCheckedChange={() => setRoleFilter(r)}>
                  {ROLE_LABELS[r]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-4 pb-4 pt-3 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-vlfk-surface-muted hover:bg-vlfk-surface-muted">
                <TableHead className="text-xs text-vlfk-ink-muted sm:text-sm">Bruker</TableHead>
                <TableHead className="text-xs text-vlfk-ink-muted sm:text-sm">Rolle</TableHead>
                <TableHead className="hidden text-xs text-vlfk-ink-muted sm:table-cell sm:text-sm">Grupper</TableHead>
                <TableHead className="hidden text-xs text-vlfk-ink-muted sm:text-sm md:table-cell">Sist innlogget</TableHead>
                <TableHead className="hidden text-xs text-vlfk-ink-muted sm:text-sm lg:table-cell">Opprettet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-vlfk-ink-muted">
                    Fant ingen brukere.
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-[180px] text-xs sm:max-w-none sm:text-sm">
                      <span className="block truncate font-medium text-vlfk-ink">{u.firstName || u.email}</span>
                      {u.firstName && <span className="block truncate text-vlfk-ink-muted">{u.email}</span>}
                      {!u.confirmed && (
                        <span className="mt-1 inline-block rounded-sm bg-vlfk-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-vlfk-ink-muted">
                          Ikke bekreftet
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RoleSelect user={u} isSelf={u.id === currentUserId} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-vlfk-ink tabular-nums sm:table-cell sm:text-sm">
                      {u.groupCount}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-vlfk-ink-muted sm:text-sm md:table-cell">
                      {formatDate(u.lastSignInAt)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-vlfk-ink-muted sm:text-sm lg:table-cell">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-vlfk-ink-muted sm:px-6">
          <span>
            {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} av {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Forrige side"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              aria-label="Neste side"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
