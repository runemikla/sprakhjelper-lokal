import { AdminIntro, AdminNotice } from '@/components/admin/admin-intro'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import { createClient } from '@/lib/supabase/server'
import { selectVoiceRows, voiceFromRow } from '@/lib/tts/available-voices'
import { listGoogleVoices } from '@/lib/tts/google-voices'
import { GEMINI_VOICES } from '@/lib/tts/gemini-voices'
import { describeVoice, googleNameOf, sortVoices, type TtsVoice } from '@/lib/tts/voices'
import { VoiceBrowser } from './voice-browser'

// Admin pages always show the current choice from the database.
export const dynamic = 'force-dynamic'

// The chosen voices. Null when the table cannot be read (before the migration).
// hasNames is false before the column for the admin's own names exists.
async function loadChosen(): Promise<{ voices: TtsVoice[] | null; hasNames: boolean }> {
  const supabase = await createClient()
  const { rows, hasNames, error } = await selectVoiceRows(supabase)
  if (error) {
    console.error('Load TTS voices error:', error.message)
    return { voices: null, hasNames: false }
  }
  return { voices: rows.map(voiceFromRow), hasNames }
}

export default async function StemmerPage() {
  await requireAdminPage('/admin/stemmer')

  const [{ voices: chosen, hasNames }, google] = await Promise.all([
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
    <div className="space-y-6">
      <AdminIntro
        title="Stemmer"
        description="Hør de norske stemmene fra Google, velg hvilke lærerne kan bruke i Lytteøving, ordlistene i Lær ord og Snakkebot, og gi dem egne navn."
      />

      {chosen === null && (
        <AdminNotice>
          Fant ikke tabellen for stemmer i databasen. Verktøyene bruker de fire faste stemmene
          (Enceladus, Iapetus, Erinome og Callirrhoe) til migrasjonen er kjørt. Du kan likevel høre på stemmene.
        </AdminNotice>
      )}
      {chosen !== null && !hasNames && (
        <AdminNotice>
          Egne navn på stemmene krever en ny kolonne i databasen. Kjør migrasjonen for stemmenavn i
          Supabase, så kan du gi stemmene navn her.
        </AdminNotice>
      )}
      {google.error && (
        <AdminNotice>
          Kunne ikke hente stemmelisten fra Google, så bare Chirp 3 HD-stemmene vises. {google.error}
        </AdminNotice>
      )}

      <div className="rounded-xl border bg-white p-4 sm:p-6">
        <VoiceBrowser
          voices={all}
          chosen={chosen ?? []}
          canEdit={chosen !== null}
          canName={chosen !== null && hasNames}
        />
      </div>
    </div>
  )
}
