import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Props for a single grammar topic card on the hub page.
interface TopicCardProps {
  title: string
  description: string
  href?: string
  icon: LucideIcon
  comingSoon?: boolean
}

export function TopicCard({
  title,
  description,
  href,
  icon: Icon,
  comingSoon = false,
}: TopicCardProps) {
  const cardInner = (
    <Card
      className={cn(
        'h-full transition-all',
        comingSoon
          ? 'opacity-60'
          : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer focus-within:ring-2 focus-within:ring-blue-400'
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9ADBE8]/30 text-blue-700">
            <Icon className="h-6 w-6" />
          </span>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{description}</p>
        {comingSoon && (
          <span className="mt-4 inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
            Kommer snart
          </span>
        )}
      </CardContent>
    </Card>
  )

  // Coming-soon topics are not clickable yet.
  if (comingSoon || !href) {
    return <div aria-disabled="true">{cardInner}</div>
  }

  return (
    <Link href={href} className="block focus:outline-none">
      {cardInner}
    </Link>
  )
}
