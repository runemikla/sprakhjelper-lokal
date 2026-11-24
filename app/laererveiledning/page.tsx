import { redirect } from 'next/navigation'

// The teacher guide has been removed; old links go to «Om verktøyene».
export default function LaererveiledningPage() {
  redirect('/om')
}
