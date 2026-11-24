import { redirect } from 'next/navigation'

// Ordrekkefølge is turned off for now. The exercise code is kept in
// ordrekkefolge-client.tsx so it can be switched on again by restoring the
// page below and the topic card in app/grammatikk/page.tsx.
export default function OrdrekkefolgePage() {
  redirect('/grammatikk')
}
