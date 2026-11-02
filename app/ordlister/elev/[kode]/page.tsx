import { redirect } from 'next/navigation'
import { normalizeAccessCode } from '@/lib/ordlister/types'

// Shared links open the list as a theme in «Lær ord».
export default async function ElevOrdlistePage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params
  redirect(`/laer-ord?liste=${normalizeAccessCode(kode)}`)
}
