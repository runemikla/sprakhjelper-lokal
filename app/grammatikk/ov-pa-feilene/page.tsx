import OvPaFeileneClient from './ov-pa-feilene-client'
import { getPageUser } from '@/lib/auth/page-user'

export default async function OvPaFeilenePage() {
  const { email, isAdmin } = await getPageUser()
  return <OvPaFeileneClient userEmail={email} isAdmin={isAdmin} />
}
