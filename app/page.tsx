import { AppNavbar } from '@/components/landing/app-navbar'
import { Hero } from '@/components/landing/hero'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <AppNavbar />
      <Hero />
      <Footer />
    </main>
  )
}

