import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { TopicCard } from '@/components/grammatikk/topic-card'
import { ArrowDownUp, BookA, Verified } from 'lucide-react'

// Grammar practice topics. Only "Ordrekkefølge" is active for now;
// the rest are placeholders that will be enabled as exercises are built.
const topics = [
  {
    title: 'Ordrekkefølge',
    description:
      'Dra og slipp ord for å bygge riktige norske setninger. Velg nivå og øv på ordstilling.',
    href: '/grammatikk/ordrekkefolge',
    icon: ArrowDownUp,
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

export default function GrammatikkPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Grammatikk øving
            </h1>
            <p className="text-xl text-gray-600">
              Velg et tema og øv på norsk grammatikk på din egen måte.
            </p>
          </div>

          {/* Topic grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <TopicCard key={topic.title} {...topic} />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
