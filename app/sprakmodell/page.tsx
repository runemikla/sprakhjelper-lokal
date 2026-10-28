import { redirect } from 'next/navigation'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
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
  const user = await getUser()

  // Server-side guard: only admins may choose the model. Hiding the menu item
  // alone is not enough, so we re-check the role here.
  if (!user) {
    redirect('/auth/login?next=/sprakmodell')
  }

  if (!(await isAdmin(user))) {
    redirect('/')
  }

  const models = await loadModels()
  // Only the non-secret settings are passed to the browser, never the key.
  const env = getEnvModelConfig()

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">Språkmodell</h1>
            <p className="text-xl text-gray-600">
              Velg hvilken modell i Azure AI Foundry alle KI-verktøyene skal bruke. Test
              modellen før du tar den i bruk. Endringen gjelder for elevene i løpet av et
              halvt minutt.
            </p>
          </div>

          {models === null && (
            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Fant ikke tabellen for språkmodeller i databasen. Verktøyene bruker modellen fra
              miljøvariablene til migrasjonen er kjørt.
            </div>
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
      </div>

      <Footer />
    </main>
  )
}
