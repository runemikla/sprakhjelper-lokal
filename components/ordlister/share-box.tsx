'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function shareUrl(code: string) {
  return `${globalThis.location?.origin ?? ''}/ordlister/elev/${code}`
}

export function CopyLinkButton({ code, label = 'Kopier lenke' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        void navigator.clipboard?.writeText(shareUrl(code)).then(() => setCopied(true))
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Kopiert' : label}
    </Button>
  )
}

// Big access code plus link, like the listening exercises.
export function ShareBox({ code }: { code: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(shareUrl(code)), [code])

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
      <p className="text-sm font-semibold text-blue-900">Del med elevene</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-gray-900">{code}</p>
          <p className="mt-1 break-all text-sm text-blue-900/80">{url}</p>
        </div>
        <CopyLinkButton code={code} />
      </div>
      <p className="mt-2 text-xs text-blue-900/70">
        Elevene skriver koden på Lær ord-siden eller åpner lenken. De trenger ikke logge inn.
      </p>
    </div>
  )
}
