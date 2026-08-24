'use client'

import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth/actions'
import { useFormStatus } from 'react-dom'

function LogoutSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Logger ut...' : 'Logg ut'}
    </Button>
  )
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmitButton />
    </form>
  )
}
