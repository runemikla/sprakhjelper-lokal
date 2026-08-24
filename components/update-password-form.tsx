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
import { updatePassword } from '@/app/auth/actions'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Oppdaterer...' : 'Oppdater passord'}
    </Button>
  )
}

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Oppdater passord</CardTitle>
          <CardDescription>Skriv inn ditt nye passord</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="update-password">Nytt passord</Label>
                <Input
                  id="update-password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="update-confirm-password">
                  Bekreft passord
                </Label>
                <Input
                  id="update-confirm-password"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
