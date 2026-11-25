import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, AudioLines, Cpu, FileText, type LucideIcon } from 'lucide-react'
import { FjordPageShell } from '@/components/landing/fjord-page-shell'
import { PageHeader } from '@/components/landing/page-header'
import { getPageUser } from '@/lib/auth/page-user'

// Admin-only settings that used to sit under the «KI-verktøy» menu.
const INNSTILLINGER: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: '/instrukser',
    title: 'Instrukser',
    description: 'Systeminstruksene bak KI-verktøyene. Lagre egne versjoner og velg hvilken som er i bruk.',
    icon: FileText,
  },
  {
    href: '/sprakmodell',
    title: 'Språkmodell',
    description: 'Velg hvilken modell i Azure AI Foundry alle KI-verktøyene skal bruke.',
    icon: Cpu,
  },
  {
    href: '/stemmer',
    title: 'Stemmer',
    description: 'Hør alle de norske stemmene og velg hvilke lærerne kan bruke i Lytteøving, ordlister og Snakkebot.',
    icon: AudioLines,
  },
]

export default async function InnstillingerPage() {
  const { user, email, isAdmin } = await getPageUser()

  // Server-side guard: hiding the menu item alone is not enough.
  if (!user) {
    redirect('/auth/login?next=/innstillinger')
  }
  if (!isAdmin) {
    redirect('/')
  }

  return (
    <FjordPageShell userEmail={email} isAdmin={isAdmin}>
      <PageHeader title="Innstillinger" description="Innstillinger for KI-verktøyene. Bare for administratorer." />

      <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
        <ul className="divide-y divide-gray-200">
          {INNSTILLINGER.map(({ href, title, description, icon: Icon }) => (
            <li key={href} className="first:[&>a]:pt-0 last:[&>a]:pb-0">
              <Link
                href={href}
                className="group flex items-center gap-4 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-vlfk-ink"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-vlfk-lyseblaa text-vlfk-ink">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-gray-900">{title}</span>
                  <span className="block text-gray-600">{description}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-gray-900 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </FjordPageShell>
  )
}
