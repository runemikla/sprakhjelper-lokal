import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export default function Page() {
  return (
    <Suspense fallback={<div className="text-white">Laster...</div>}>
      <LoginForm />
    </Suspense>
  )
}
