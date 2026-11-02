import { Info } from 'lucide-react'

// Shown while word lists are stored only in the browser (no database yet).
export function PreviewNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <b>Forhåndsvisning.</b> Ordlistene lagres foreløpig bare i denne nettleseren. Delingskoden
        virker derfor bare på denne maskinen til databasen er koblet til.
      </p>
    </div>
  )
}
