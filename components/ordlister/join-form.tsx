'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/ordlister/types'

// Students open a teacher's word list by typing its four-character code.
export function JoinWordListForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  return (
    <form
      className="mt-6 rounded-xl border border-white/30 bg-white/10 px-4 py-4 backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault()
        const normalized = normalizeAccessCode(code)
        if (!isValidAccessCode(normalized)) {
          setError(true)
          return
        }
        router.push(`/ordlister/elev/${normalized}`)
      }}
    >
      <label htmlFor="ordliste-kode" className="text-sm font-semibold text-white">
        Har du fått en kode fra læreren?
      </label>
      <div className="mt-2 flex max-w-xs gap-2">
        <Input
          id="ordliste-kode"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(false)
          }}
          maxLength={4}
          placeholder="ABCD"
          autoComplete="off"
          className="h-10 bg-white font-mono text-lg tracking-[0.3em] uppercase"
        />
        <Button type="submit" className="h-10">
          Åpne
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-white">Koden har fire tegn, for eksempel K7PM.</p>}
    </form>
  )
}
