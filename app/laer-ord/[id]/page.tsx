import { redirect } from 'next/navigation'
import { Exercises } from '@/components/laer-ord/exercises'
import { getPageUser } from '@/lib/auth/page-user'
import { THEMES } from '@/lib/laer-ord/data'

interface LaerOrdListPageProps {
  params: Promise<{ id: string }>
}

// Exercises for one word list (uuid) or one built-in theme (theme id).
export default async function LaerOrdListPage({ params }: LaerOrdListPageProps) {
  const { id } = await params
  const { user, email, isAdmin, isTeacher } = await getPageUser()
  if (!user) redirect(`/auth/login?next=/laer-ord/${encodeURIComponent(id)}`)

  const theme = THEMES.find((t) => t.id === id)
  return (
    <Exercises
      key={id}
      userEmail={email}
      isAdmin={isAdmin}
      canEdit={isTeacher}
      theme={theme}
      listId={theme ? undefined : id}
    />
  )
}
