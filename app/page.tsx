import { AppNavbar } from '@/components/landing/app-navbar'
import { Hero } from '@/components/landing/hero'
import { Footer } from '@/components/landing/footer'
import { StudentHome } from '@/components/landing/student-home'
import { getPageUser } from '@/lib/auth/page-user'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const { user, email, isStudent } = await getPageUser()

  // Signed-in students get the tools as cards, plus the word lists their
  // groups have been given. Everyone else sees the ordinary front page.
  if (user && isStudent) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('word_lists')
      .select('id, title')
      .order('updated_at', { ascending: false })
      .limit(12)
    return <StudentHome userEmail={email} wordLists={data ?? []} />
  }

  return (
    <main className="min-h-screen">
      <AppNavbar />
      <Hero />
      <Footer />
    </main>
  )
}
