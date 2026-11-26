import { redirect } from 'next/navigation'
import { FjordPageShell } from '@/components/landing/fjord-page-shell'
import { PageHeader } from '@/components/landing/page-header'
import { getPageUser } from '@/lib/auth/page-user'
import { createClient } from '@/lib/supabase/server'
import { voiceFromRow, type TtsVoiceRow } from '@/lib/tts/available-voices'
import { listGoogleVoices } from '@/lib/tts/google-voices'
import { GEMINI_VOICES } from '@/lib/tts/gemini-voices'
import { describeVoice, googleNameOf, sortVoices, type TtsVoice } from '@/lib/tts/voices'
import { VoiceBrowser } from './voice-browser'

// Admin pages always show the current choice from the database.
export const dynamic = 'force-dynamic'

// The chosen voices. Null when the table cannot be read (before the migration).
async function loadChosen(): Promise<TtsVoice[] | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('tts_voices').select('voice_id, google_name, gender')
  if (error) {
    console.error('Load TTS voices error:', error.message)
    return null
  }
  return ((data ?? []) as TtsVoiceRow[]).map(voiceFromRow)
}

export default async function StemmerPage() {
  const { user, email, isAdmin } = await getPageUser()

  // Server-side guard: hiding the menu item alone is not enough.
  if (!user) redirect('/auth/login?next=/stemmer')
  if (!isAdmin) redirect('/')

  const [chosen, google] = await Promise.all([
    loadChosen(),
    listGoogleVoices().then(
      (voices) => ({ voices, error: null as string | null }),
      (error: unknown) => ({ voices: [] as TtsVoice[], error: error instanceof Error ? error.message : String(error) })
    ),
  ])

  // Without the list from Google, the Chirp 3 HD voices we know of are shown.
  const known = google.voices.length > 0 ? google.voices : GEMINI_VOICES.map((v) => describeVoice(googleNameOf(v.name)))
  // Chosen voices Google no longer lists are shown too, so they can be removed.
  const all = sortVoices([...known, ...(chosen ?? []).filter((c) => !known.some((k) => k.id === c.id))])

  return (
    <FjordPageShell userEmail={email} isAdmin={isAdmin}>
      <PageHeader
        title="Stemmer"
        description="Hør de norske stemmene fra Google og velg hvilke lærerne kan bruke i Lytteøving, ordlistene i Lær ord og Snakkebot."
      />

      <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
        {chosen === null && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Fant ikke tabellen for stemmer i databasen. Verktøyene bruker de fire faste stemmene
            (Enceladus, Iapetus, Erinome og Callirrhoe) til migrasjonen er kjørt. Du kan likevel høre på stemmene.
          </div>
        )}
        {google.error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Kunne ikke hente stemmelisten fra Google, så bare Chirp 3 HD-stemmene vises. {google.error}
          </div>
        )}
        <VoiceBrowser voices={all} chosenIds={(chosen ?? []).map((v) => v.id)} canEdit={chosen !== null} />
      </div>
    </FjordPageShell>
  )
}
