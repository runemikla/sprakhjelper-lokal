'use client'

import { useEffect, useState } from 'react'

// The number of new users since the admin last opened /admin/brukere (see
// app/api/admin/nye-brukere). Fetched when the page opens and whenever
// refreshKey changes, for example on a new page in the admin area.
export function useNewUsersCount(enabled: boolean, refreshKey?: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    fetch('/api/admin/nye-brukere', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((body: { count?: number }) => {
        if (active) setCount(Math.max(0, Number(body.count) || 0))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [enabled, refreshKey])

  return enabled ? count : 0
}

/** «3 nye brukere» / «1 ny bruker», for screen readers and tooltips. */
export function newUsersLabel(count: number): string {
  return count === 1 ? '1 ny bruker' : `${count} nye brukere`
}

/** What the badge shows: the number, or «9+». */
export function badgeText(count: number): string {
  return count > 9 ? '9+' : String(count)
}
