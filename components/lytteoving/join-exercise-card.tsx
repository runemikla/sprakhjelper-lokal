'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ACCESS_CODE_LENGTH,
  isValidAccessCode,
  normalizeAccessCode,
} from '@/lib/lytteoving'

export function JoinExerciseCard() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeAccessCode(code)

    if (!isValidAccessCode(normalized)) {
      setError('Skriv inn koden på 4 tegn som du fikk av læreren.')
      return
    }

    setError(null)
    router.push(`/lytteoving/${normalized}`)
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Har du en kode?</h2>
        <p className="text-sm text-gray-600">
          Skriv inn koden fra læreren for å åpne lytteøvingen. Du trenger ikke
          logge inn.
        </p>
      </div>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
            <Input
              id="exercise-code"
              aria-label="Kode"
              value={code}
              maxLength={ACCESS_CODE_LENGTH}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCD"
              className="h-28 border border-gray-200 bg-white shadow-none focus-visible:ring-1 text-center text-3xl font-semibold tracking-[0.35em] uppercase md:text-3xl"
              onChange={(event) => {
                setCode(normalizeAccessCode(event.target.value).slice(0, ACCESS_CODE_LENGTH))
                setError(null)
              }}
            />
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">
              Åpne lytteøving
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
