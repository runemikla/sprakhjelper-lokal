import type { ReactNode } from 'react'

interface AdminIntroProps {
  title: string
  description?: ReactNode
  // Buttons shown to the right of the title (below it on phones).
  actions?: ReactNode
}

// Title and short description at the top of each admin page, as in the
// welcome row of the Dashboard 5 block.
export function AdminIntro({ title, description, actions }: AdminIntroProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-vlfk-ink sm:text-2xl">{title}</h2>
        {description && <p className="max-w-3xl text-sm text-vlfk-ink-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  )
}

// Notice shown when a table the page needs is missing (migration not run).
export function AdminNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-vlfk-gul bg-vlfk-gul/20 px-4 py-3 text-sm text-vlfk-ink">{children}</div>
  )
}
