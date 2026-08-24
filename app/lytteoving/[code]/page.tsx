import { notFound } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/lytteoving'
import { LytteovingPlayClient } from './lytteoving-play-client'

interface LytteovingCodePageProps {
  params: Promise<{ code: string }>
}

export default async function LytteovingCodePage({
  params,
}: LytteovingCodePageProps) {
  const { code } = await params
  const normalized = normalizeAccessCode(code)

  if (!isValidAccessCode(normalized)) {
    notFound()
  }

  const user = await getUser()

  return (
    <LytteovingPlayClient
      code={normalized}
      userEmail={user?.email ?? null}
    />
  )
}
