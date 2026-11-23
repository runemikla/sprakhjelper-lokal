import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  // Optional link back to the parent page, shown above the title.
  backHref?: string
  backLabel?: string
  // Buttons or controls shown to the right of the title (below it on phones).
  actions?: ReactNode
  // Smaller header for views that need the whole screen height on phones:
  // the description is hidden below the sm breakpoint.
  compact?: boolean
  className?: string
}

// Page title and short description shown in white on the fjord background,
// above the white content panel. Used by every tool page so they look alike.
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Tilbake',
  actions,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(compact ? 'mb-3 sm:mb-6' : 'mb-6', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1
            className={cn(
              'font-semibold text-white drop-shadow',
              compact ? 'text-2xl sm:text-3xl' : 'text-3xl'
            )}
          >
            {title}
          </h1>
          {description && (
            <p className={cn('mt-1 text-white/90 drop-shadow', compact && 'hidden sm:block')}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}
