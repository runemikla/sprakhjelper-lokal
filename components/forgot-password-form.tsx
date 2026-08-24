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
import { forgotPassword } from '@/app/auth/actions'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Sender...' : 'Send tilbakestillingslenke'}
    </Button>
  )
}

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Glemt passord</CardTitle>
          <CardDescription>
            Skriv inn e-posten din for å motta en tilbakestillingslenke
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={forgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="forgot-email">E-post</Label>
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  placeholder="din@epost.no"
                  required
                />
              </div>
              <SubmitButton />
            </div>
            <div className="mt-4 text-center text-sm">
              Husker du passordet?{' '}
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
