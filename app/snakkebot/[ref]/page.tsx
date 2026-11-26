import { notFound, redirect } from 'next/navigation'
import { ChatbotChat } from '@/components/snakkebot/chat'
import { getPageUser } from '@/lib/auth/page-user'
import { loadChatbot, loadCollection } from '@/lib/snakkebot/server'
import { parseRef } from '@/lib/snakkebot/types'

export const metadata = { title: 'Snakkebot - Språkhjelp' }

// /snakkebot/<id> for group members and the teacher, /snakkebot/<KODE> for
// anyone with the code (no login needed).
export default async function SnakkebotSamtalePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: raw } = await params
  const ref = parseRef(raw)
  if (!ref) notFound()

  const { email, isAdmin, isTeacher } = await getPageUser()
  const bot = await loadChatbot(ref).catch(() => null)
  if (!bot) {
    // The code box takes collection codes too.
    if ('code' in ref && (await loadCollection(ref.code).catch(() => null))) {
      redirect(`/snakkebot/samling/${ref.code}`)
    }
    notFound()
  }

  // Only admins change chatbots; teachers see the code to share it.
  const canEdit = isAdmin

  return (
    <ChatbotChat
      userEmail={email}
      isAdmin={isAdmin}
      chatbot={{
        id: bot.id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        level: bot.level,
        accessCode: bot.accessCode,
      }}
      // The browser talks to the server with the same reference it was opened with.
      chatRef={ref}
      editHref={canEdit ? `/snakkebot/${bot.id}/rediger` : null}
      showCode={isAdmin || isTeacher}
    />
  )
}
