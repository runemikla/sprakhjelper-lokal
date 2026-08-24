import OrdrekkefolgeClient from './ordrekkefolge-client'
import { getUser } from '@/lib/supabase/server'

export default async function OrdrekkefolgePage() {
  const user = await getUser()
  return <OrdrekkefolgeClient userEmail={user?.email ?? null} />
}
