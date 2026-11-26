import { AdminIntro, AdminNotice } from '@/components/admin/admin-intro'
import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
import { getEnvModelConfig } from '@/lib/ai/azure-core'
import { ModelSettingsPanel, type AiModel } from './model-settings'

// Admin pages always show the current models from the database.
export const dynamic = 'force-dynamic'

// Loads the registered models. Returns null when the table cannot be read
// (for example before the migration is applied).
async function loadModels(): Promise<AiModel[] | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_models')
    .select('id, name, deployment, api_version, model_type, reasoning_effort, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Load AI models error:', error.message)
    return null
  }
  return data ?? []
}

function hostOf(endpoint: string): string | null {
  try {
    return endpoint ? new URL(endpoint).host : null
  } catch {
    return null
  }
}

export default async function SprakmodellPage() {
  await requireAdminPage('/admin/sprakmodell')

  const models = await loadModels()
  // Only the non-secret settings are passed to the browser, never the key.
  const env = getEnvModelConfig()

  return (
    <div className="max-w-4xl space-y-6">
      <AdminIntro
        title="Språkmodell"
        description="Velg hvilken modell i Azure AI Foundry alle KI-verktøyene skal bruke. Test modellen før du tar den i bruk. Endringen gjelder for elevene i løpet av et halvt minutt."
      />

      {models === null && (
        <AdminNotice>
          Fant ikke tabellen for språkmodeller i databasen. Verktøyene bruker modellen fra
          miljøvariablene til migrasjonen er kjørt.
        </AdminNotice>
      )}

      <ModelSettingsPanel
        models={models ?? []}
        canEdit={models !== null}
        envModel={{
          deployment: env.deployment,
          apiVersion: env.apiVersion,
          modelType: env.modelType,
          reasoningEffort: env.reasoningEffort,
          endpointHost: hostOf(env.endpoint),
        }}
      />
    </div>
  )
}
