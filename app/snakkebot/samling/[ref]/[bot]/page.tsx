import { notFound } from 'next/navigation'
import { ChatbotChat } from '@/components/snakkebot/chat'
import { getPageUser } from '@/lib/auth/page-user'
import { loadChatbot, loadCollection } from '@/lib/snakkebot/server'
import { isUuid, parseCollectionRef, type ChatbotRef } from '@/lib/snakkebot/types'

export const metadata = { title: 'Snakkebot - Språkhjelp' }

// One case in a collection. The browser talks to the server with the same
// collection reference, so a code is enough (no login needed).
export default async function SamlingSamtalePage({ params }: { params: Promise<{ ref: string; bot: string }> }) {
  const { ref: raw, bot: botId } = await params
  const collectionRef = parseCollectionRef(raw)
  if (!collectionRef || !isUuid(botId)) notFound()

  const chatRef: ChatbotRef = { collection: collectionRef, id: botId.toLowerCase() }
  const { email, isAdmin } = await getPageUser()
  const [bot, collection] = await Promise.all([
    loadChatbot(chatRef).catch(() => null),
    loadCollection(collectionRef).catch(() => null),
  ])
  if (!bot || !collection) notFound()

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
        accessCode: collection.accessCode,
      }}
      chatRef={chatRef}
      editHref={isAdmin ? `/snakkebot/${bot.id}/rediger` : null}
      showCode={false}
      backHref={`/snakkebot/samling/${collectionRef}`}
      backLabel={collection.name}
    />
  )
}
