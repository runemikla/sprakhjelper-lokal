'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { groupStore } from '@/lib/ordlister/db-store'
import { isValidGroupCode, normalizeGroupCode } from '@/lib/ordlister/types'

const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

// «Ny gruppe»: teachers make a group or join one with a code; students join.
export function NewGroupClient({ isTeacher }: { isTeacher: boolean }) {
  const router = useRouter()
  const back = () => router.push('/grupper')

  return (
    <>
      <div>
        <Link
          href="/grupper"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Alle grupper
        </Link>
        <h1 className="text-3xl font-bold text-white drop-shadow">Ny gruppe</h1>
        <p className="mt-1 text-white/90 drop-shadow">
          {isTeacher
            ? 'Lag en ny gruppe for klassen din, eller bli med i en gruppe med en kode.'
            : 'Skriv inn koden du fikk av læreren for å bli med i gruppen.'}
        </p>
      </div>

      {isTeacher && <CreateGroupCard onCreated={back} />}
      <JoinGroupCard onJoined={back} />
    </>
  )
}

function JoinGroupCard({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeGroupCode(code)
    if (!isValidGroupCode(normalized)) {
      setMessage({ ok: false, text: 'Koden har seks tegn, for eksempel K7PM2X.' })
      return
    }
    setBusy(true)
    try {
      const joined = await groupStore.join(normalized)
      if (!joined) {
        setMessage({ ok: false, text: 'Fant ingen gruppe med den koden. Sjekk koden med læreren.' })
      } else {
        setMessage({ ok: true, text: `Du er nå med i gruppen «${joined.name}».` })
        setCode('')
        onJoined()
      }
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e, 'Kunne ikke bli med i gruppen.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={card}>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="group-code" className="text-base font-semibold text-gray-900">
            Bli med i en gruppe
          </Label>
          <p className="text-sm text-gray-600">Skriv inn tilgangskoden du fikk av læreren.</p>
          <div className="flex max-w-sm gap-2">
            <Input
              id="group-code"
              value={code}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              placeholder="K7PM2X"
              className="h-11 bg-white font-mono text-lg uppercase tracking-[0.3em]"
              onChange={(e) => {
                setCode(normalizeGroupCode(e.target.value).slice(0, 6))
                setMessage(null)
              }}
            />
            <Button type="submit" className="h-11" disabled={busy || !code}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Bli med
            </Button>
          </div>
          {message && (
            <p
              className={
                message.ok
                  ? 'rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900'
                  : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
              }
            >
              {message.text}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function CreateGroupCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      await groupStore.create(trimmed)
      setName('')
      onCreated()
    } catch (e) {
      setError(errorMessage(e, 'Kunne ikke lage gruppen.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={card}>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="group-name" className="text-base font-semibold text-gray-900">
            Lag ny gruppe
          </Label>
          <p className="text-sm text-gray-600">
            Gruppen får en tilgangskode som elevene bruker for å bli med.
          </p>
          <div className="flex max-w-lg gap-2">
            <Input
              id="group-name"
              value={name}
              maxLength={100}
              placeholder="For eksempel «1STA norsk»"
              className="h-11 bg-white text-base"
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" className="h-11" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lag gruppe
            </Button>
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
