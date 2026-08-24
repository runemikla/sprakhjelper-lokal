'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/auth/actions'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Logger inn...' : 'Logg inn'}
    </Button>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const next = searchParams.get('next') ?? '/spraakhjelper'

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Logg inn</CardTitle>
          <CardDescription>
            Skriv inn e-post og passord for å logge inn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {message}
            </div>
          )}
          <form action={login}>
            <input type="hidden" name="next" value={next} />
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="login-email">E-post</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="din@epost.no"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="login-password">Passord</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Glemt passord?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                />
              </div>
              <SubmitButton />
            </div>
            <div className="mt-4 text-center text-sm">
              Har du ikke konto?{' '}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Registrer deg
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
