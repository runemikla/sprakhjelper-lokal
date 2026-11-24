'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { isChatbotCode, normalizeCode } from '@/lib/snakkebot/types'

// Students type the 4-character code from the teacher, as in Lytteøving.
export function JoinChatbotCard({ children }: { children?: ReactNode }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeCode(code)
    if (!isChatbotCode(normalized)) {
      setError('Skriv inn koden på 4 tegn som du fikk av læreren.')
      return
    }
    setError(null)
    router.push(`/snakkebot/${normalized}`)
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
            <Input
              id="chatbot-code"
              aria-label="Kode"
              value={code}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCD"
              className="h-20 border border-gray-200 bg-white shadow-none focus-visible:ring-1 text-center text-3xl font-semibold tracking-[0.35em] uppercase md:text-3xl"
              onChange={(event) => {
                setCode(normalizeCode(event.target.value).slice(0, 4))
                setError(null)
              }}
            />
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">
              Åpne snakkebot
            </Button>
          </div>
        </form>
        {children}
      </CardContent>
    </Card>
  )
}
