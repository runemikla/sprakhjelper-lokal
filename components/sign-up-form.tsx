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
import { signup } from '@/app/auth/actions'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Registrerer...' : 'Registrer deg'}
    </Button>
  )
}

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registrer deg</CardTitle>
          <CardDescription>
            Opprett en konto for å komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="signup-email">E-post</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="din@epost.no"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Passord</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <SubmitButton />
            </div>
            <div className="mt-4 text-center text-sm">
              Har du allerede en konto?{' '}
              <Link
                href="/auth/login"
                className="underline underline-offset-4"
              >
                Logg inn
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
