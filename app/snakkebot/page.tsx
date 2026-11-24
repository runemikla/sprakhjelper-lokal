import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { JoinChatbotCard } from '@/components/snakkebot/join-card'
import { ChatbotList, type ChatbotListItem } from '@/components/snakkebot/chatbot-list'
import { getPageUser } from '@/lib/auth/page-user'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Snakkebot - Språkhjelp' }

interface Row {
  id: string
  name: string
  description: string
  access_code: string
  level: string | null
  created_by: string
  chatbot_groups: { group_id: string }[]
}

export default async function SnakkebotPage() {
  const { user, email, isAdmin, isTeacher } = await getPageUser()

  let items: ChatbotListItem[] = []
  if (user) {
    const supabase = await createClient()
    // RLS: chatbots shared with the user's groups; all of them for admins
    // (and for teachers once 20261124200000_chatbots_admin_only.sql has run).
    const { data } = await supabase
      .from('chatbots')
      .select('id, name, description, access_code, level, created_by, chatbot_groups(group_id)')
      .order('updated_at', { ascending: false })
    items = ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        accessCode: row.access_code,
        level: row.level,
        groupCount: row.chatbot_groups?.length ?? 0,
        // Only admins make and change chatbots; teachers see the code to
        // give their students.
        canManage: isAdmin,
        showCode: isAdmin || isTeacher,
      }))
  }

  if (isAdmin) {
    return (
      <ListeningPageShell userEmail={email} isAdmin={isAdmin}>
        <PageHeader
          title="Snakkebot"
          description="Lag KI-samtalepartnere som elevene snakker med. Del dem med grupper, eller gi elevene og lærerne koden."
          actions={
            <Button asChild variant="outline">
              <Link href="/snakkebot/ny">Lag ny</Link>
            </Button>
          }
        />
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <ChatbotList
              items={items}
              emptyText="Du har ikke laget noen snakkeboter ennå. Trykk «Lag ny» for å komme i gang."
            />
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={email} isAdmin={isAdmin}>
      <PageHeader
        title="Snakkebot"
        description="Snakk norsk med en KI som svarer med stemme. Skriv inn koden fra læreren, eller velg en snakkebot fra gruppen din."
      />
      {user && items.length > 0 && (
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {isTeacher ? 'Snakkeboter du kan bruke' : 'Fra gruppene dine'}
            </h2>
            {isTeacher && (
              <p className="mb-3 text-sm text-gray-600">Gi elevene koden, så kan de åpne snakkeboten uten å logge inn.</p>
            )}
            <ChatbotList items={items} emptyText="" />
          </CardContent>
        </Card>
      )}
      <JoinChatbotCard>
        {!user && (
          <p className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
            Lærere kan{' '}
            <Link href="/auth/login?next=/snakkebot" className="font-medium underline underline-offset-4">
              logge inn
            </Link>{' '}
            for å se hvilke snakkeboter som finnes.
          </p>
        )}
      </JoinChatbotCard>
    </ListeningPageShell>
  )
}
