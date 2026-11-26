'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { deleteUser, getUserContent, type UserContent } from '@/app/admin/brukere/actions'
import { Button } from '@/components/ui/button'

// «Slett bruker» with a confirmation that lists what goes with the account.

function contentLines(c: UserContent): string[] {
  const lines: string[] = []
  const add = (n: number, one: string, many: string) => n > 0 && lines.push(`${n} ${n === 1 ? one : many}`)
  add(c.wordLists, 'ordliste med bilder og lyd', 'ordlister med bilder og lyd')
  add(c.groups, 'gruppe (elevene i den mister tilgangen til gruppen)', 'grupper (elevene i dem mister tilgangen til gruppene)')
  add(c.chatbots, 'snakkebot', 'snakkeboter')
  add(c.chatbotCollections, 'snakkebot-samling', 'snakkebot-samlinger')
  add(c.listeningExercises, 'lytteøving', 'lytteøvinger')
  add(c.groupMemberships, 'gruppemedlemskap', 'gruppemedlemskap')
  return lines
}

export function DeleteUserButton({ userId, email, onDeleted }: { userId: string; email: string; onDeleted: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [content, setContent] = React.useState<UserContent | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    setError(null)
    if (next) {
      setContent(null)
      getUserContent(userId).then((result) => (result.ok ? setContent(result.content) : setError(result.error)))
    }
  }

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.ok) {
        setOpen(false)
        onDeleted()
      } else {
        setError(result.error)
      }
    })

  const lines = content ? contentLines(content) : []

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-vlfk-ink-muted hover:text-vlfk-ink" aria-label={`Slett ${email}`}>
          <Trash2 className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl focus:outline-none sm:p-6">
          <Dialog.Title className="text-lg font-semibold text-vlfk-ink">Slette brukeren?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-vlfk-ink-muted">
            Kontoen til <span className="font-medium text-vlfk-ink">{email}</span> slettes for godt, sammen med alt
            brukeren har laget. Det kan ikke angres.
          </Dialog.Description>

          <div className="mt-4 rounded-lg bg-vlfk-surface-muted p-3 text-sm text-vlfk-ink">
            {content === null && !error ? (
              <p className="text-vlfk-ink-muted">Ser etter hva brukeren har laget …</p>
            ) : lines.length > 0 ? (
              <>
                <p className="mb-1 font-medium">Dette slettes også:</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : content ? (
              <p>Brukeren har ikke laget noe i Språkhjelp.</p>
            ) : null}
          </div>

          {error && <p className="mt-3 rounded-md bg-vlfk-rod-oransje/15 px-3 py-2 text-sm text-vlfk-ink">{error}</p>}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={pending}>
                Avbryt
              </Button>
            </Dialog.Close>
            <Button variant="destructive" onClick={confirm} disabled={pending || content === null}>
              {pending ? 'Sletter …' : 'Slett bruker'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
