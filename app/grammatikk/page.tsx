import { FjordPageShell } from '@/components/landing/fjord-page-shell'
import { PageHeader } from '@/components/landing/page-header'
import { TopicCard } from '@/components/grammatikk/topic-card'
import { getPageUser } from '@/lib/auth/page-user'
import { ArrowDownUp, BookA, Dumbbell, Verified } from 'lucide-react'

// Grammar practice topics. Topics with comingSoon are placeholders that will
// be enabled as exercises are built.
const topics = [
  {
    title: 'Ordrekkefølge',
    description:
      'Dra og slipp ord for å bygge riktige norske setninger. Velg nivå og øv på ordstilling.',
    href: '/grammatikk/ordrekkefolge',
    icon: ArrowDownUp,
  },
  {
    title: 'Øv på feilene dine',
    description:
      'Få øvinger som passer til feilene i en tekst du har skrevet i Skrivehjelp.',
    href: '/grammatikk/ov-pa-feilene',
    icon: Dumbbell,
  },
  {
    title: 'Verbbøying',
    description:
      'Øv på å bøye verb i presens, preteritum og perfektum.',
    icon: Verified,
    comingSoon: true,
  },
  {
    title: 'Substantivbøying',
    description:
      'Øv på bestemt og ubestemt form, entall og flertall av substantiv.',
    icon: BookA,
    comingSoon: true,
  },
]

const comingSoon = topics.filter((topic) => topic.comingSoon)

export default async function GrammatikkPage() {
  const { email, isAdmin } = await getPageUser()

  return (
    <FjordPageShell userEmail={email} isAdmin={isAdmin}>
      <PageHeader
        title="Grammatikkøving"
        description="Velg et tema og øv på norsk grammatikk på din egen måte."
      />

      {/* Topic grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topics.filter((topic) => !topic.comingSoon).map((topic) => (
          <TopicCard key={topic.title} {...topic} />
        ))}
      </div>

      {comingSoon.length > 0 && (
        <p className="mt-6 text-sm text-white/90 drop-shadow">
          Kommer snart: {new Intl.ListFormat('nb', { type: 'conjunction' }).format(comingSoon.map((topic) => topic.title))}
        </p>
      )}
    </FjordPageShell>
  )
}
