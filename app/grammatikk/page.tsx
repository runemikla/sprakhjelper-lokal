import { FjordPageShell } from '@/components/landing/fjord-page-shell'
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

export default async function GrammatikkPage() {
  const { email, isAdmin } = await getPageUser()

  return (
    <FjordPageShell userEmail={email} isAdmin={isAdmin} maxWidth="max-w-5xl">
      {/* Header */}
      <div className="text-center mb-10 mt-6">
        <h1 className="text-4xl font-bold text-white drop-shadow mb-4">
          Grammatikk øving
        </h1>
        <p className="text-xl text-white/90 drop-shadow">
          Velg et tema og øv på norsk grammatikk på din egen måte.
        </p>
      </div>

      {/* Topic grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topics.map((topic) => (
          <TopicCard key={topic.title} {...topic} />
        ))}
      </div>
    </FjordPageShell>
  )
}
