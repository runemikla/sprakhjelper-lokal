'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  guessModelType,
  REASONING_EFFORTS,
  type ModelCheckResult,
  type ModelType,
} from '@/lib/ai/azure-core'
import {
  activateAiModel,
  createAiModel,
  deleteAiModel,
  testAiModel,
  type ActionResult,
} from './actions'

export interface AiModel {
  id: string
  name: string
  deployment: string
  api_version: string
  model_type: string
  reasoning_effort: string
  is_active: boolean
  created_at: string
}

interface EnvModel {
  deployment: string
  apiVersion: string
  modelType: string
  reasoningEffort: string
  endpointHost: string | null
}

interface Settings {
  deployment: string
  apiVersion: string
  modelType: ModelType
  reasoningEffort: string
}

// Deployments in the Azure AI Foundry resource, offered as suggestions in the
// form. Any other deployment name can be typed in.
const SUGGESTED_DEPLOYMENTS = [
  'gpt-6.1-terra',
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'gpt-5.4',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
]

const MODEL_TYPE_LABELS: Record<ModelType, string> = {
  standard: 'Standard',
  reasoning: 'Reasoning (tenker før den svarer)',
}

const EFFORT_LABELS: Record<string, string> = {
  minimal: 'Minimal (raskest)',
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy (tregest)',
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function describe(settings: { modelType: string; reasoningEffort: string; apiVersion: string }) {
  const type = settings.modelType === 'reasoning' ? `reasoning, ${EFFORT_LABELS[settings.reasoningEffort]?.toLowerCase() ?? settings.reasoningEffort} tenking` : 'standard'
  return `${type} · API ${settings.apiVersion}`
}

function emptyForm(): Settings & { name: string } {
  return { name: '', deployment: '', apiVersion: 'v1', modelType: 'standard', reasoningEffort: 'low' }
}

function TestResults({ results }: { results: ModelCheckResult[] }) {
  const allOk = results.every((result) => result.ok)
  return (
    <div
      className={`space-y-2 rounded-md px-3 py-2 text-sm ${
        allOk ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
      }`}
    >
      <p className="font-medium">
        {allOk ? 'Alle tester OK. Modellen kan brukes av verktøyene.' : 'Testen feilet. Ikke ta i bruk denne modellen ennå.'}
      </p>
      <ul className="space-y-1">
        {results.map((result) => (
          <li key={result.name}>
            {result.ok ? '✓' : '✗'} {result.name} ({result.seconds} s)
            <div className="break-words pl-4 text-xs opacity-80">{result.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ModelSettingsPanel({
  models,
  canEdit,
  envModel,
}: {
  models: AiModel[]
  // False when the ai_models table is not reachable (for example before the
  // migration is applied). The page is then read-only.
  canEdit: boolean
  envModel: EnvModel
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<(Settings & { name: string }) | null>(null)
  // Test results keyed by model id, or "form" for the unsaved form.
  const [testResults, setTestResults] = useState<Record<string, ModelCheckResult[]>>({})
  const [testingKey, setTestingKey] = useState<string | null>(null)

  function clearFormTest() {
    setTestResults((previous) => {
      const next = { ...previous }
      delete next.form
      return next
    })
  }

  const activeModel = models.find((model) => model.is_active) ?? null

  function run(action: () => Promise<ActionResult>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(successMessage)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  async function test(key: string, settings: Settings) {
    setTestingKey(key)
    try {
      const result = await testAiModel(settings)
      if (result.ok) setTestResults((previous) => ({ ...previous, [key]: result.results }))
      else toast.error(result.error)
    } catch {
      toast.error('Testen kunne ikke kjøres.')
    } finally {
      setTestingKey(null)
    }
  }

  function settingsOf(model: AiModel): Settings {
    return {
      deployment: model.deployment,
      apiVersion: model.api_version,
      modelType: model.model_type as ModelType,
      reasoningEffort: model.reasoning_effort,
    }
  }

  function activate(model: AiModel | null) {
    const label = model ? model.name : `standardmodellen (${envModel.deployment})`
    if (!window.confirm(`Bytte alle KI-verktøyene til ${label}?`)) return
    run(() => activateAiModel({ modelId: model?.id ?? null }), `Verktøyene bruker nå ${label}.`)
  }

  function remove(model: AiModel) {
    if (!window.confirm(`Slette ${model.name} fra listen? Deploymenten i Azure blir ikke slettet.`)) return
    run(() => deleteAiModel({ modelId: model.id }), 'Modellen er fjernet fra listen.')
  }

  function save(activate: boolean) {
    if (!form) return
    run(
      () => createAiModel({ ...form, name: form.name.trim() || form.deployment, activate }),
      activate ? 'Modellen er lagret og tatt i bruk.' : 'Modellen er lagret.',
      () => {
        setForm(null)
        clearFormTest()
      }
    )
  }

  const formTestOk = testResults.form?.every((result) => result.ok) ?? false

  return (
    <div className="space-y-8">
      {/* What the tools use right now */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">I bruk nå</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {activeModel ? (
            <>
              <p className="text-lg font-semibold text-gray-900">{activeModel.name}</p>
              <p>
                Deployment <code className="rounded bg-gray-100 px-1">{activeModel.deployment}</code> ·{' '}
                {describe({
                  modelType: activeModel.model_type,
                  reasoningEffort: activeModel.reasoning_effort,
                  apiVersion: activeModel.api_version,
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900">
                Standardmodellen: {envModel.deployment}
              </p>
              <p>{describe(envModel)} · fra miljøvariablene i Coolify</p>
            </>
          )}
          {envModel.endpointHost && (
            <p className="text-xs text-gray-500">Azure-ressurs: {envModel.endpointHost}</p>
          )}
        </CardContent>
      </Card>

      {/* Registered models */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Modeller</CardTitle>
          <p className="text-sm text-gray-600">
            Deploymentene må ligge i samme Azure-ressurs som standardmodellen. Bruk «Test» før du
            tar en modell i bruk.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
            {/* The environment model is always available as a fallback */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Standard fra Coolify ({envModel.deployment})</span>
                  {!activeModel && <Badge>I bruk</Badge>}
                </div>
                <p className="text-xs text-gray-500">{describe(envModel)}</p>
              </div>
              {canEdit && activeModel && (
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => activate(null)}>
                  Bruk denne
                </Button>
              )}
            </div>

            {models.map((model) => (
              <div key={model.id} className="space-y-2 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.is_active && <Badge>I bruk</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      <code>{model.deployment}</code> ·{' '}
                      {describe({
                        modelType: model.model_type,
                        reasoningEffort: model.reasoning_effort,
                        apiVersion: model.api_version,
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingKey !== null}
                      onClick={() => test(model.id, settingsOf(model))}
                    >
                      {testingKey === model.id ? 'Tester…' : 'Test'}
                    </Button>
                    {canEdit && !model.is_active && (
                      <>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => activate(model)}>
                          Bruk denne
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={isPending}
                          onClick={() => remove(model)}
                        >
                          Slett
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {testResults[model.id] && <TestResults results={testResults[model.id]} />}
              </div>
            ))}
          </div>

          {/* Form for a new model */}
          {canEdit &&
            (form ? (
              <div className="space-y-3 rounded-md border border-blue-200 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="model-deployment">Deployment-navn i Azure</Label>
                    <Input
                      id="model-deployment"
                      list="model-deployment-suggestions"
                      value={form.deployment}
                      placeholder="For eksempel gpt-5.4"
                      onChange={(event) => {
                        const deployment = event.target.value.trim()
                        setForm({ ...form, deployment, modelType: guessModelType(deployment) })
                        clearFormTest()
                      }}
                    />
                    <datalist id="model-deployment-suggestions">
                      {SUGGESTED_DEPLOYMENTS.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model-name">Navn i listen (valgfritt)</Label>
                    <Input
                      id="model-name"
                      value={form.name}
                      maxLength={200}
                      placeholder={form.deployment || 'For eksempel «GPT-5.4, rask»'}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model-type">Modelltype</Label>
                    <select
                      id="model-type"
                      className={selectClassName}
                      value={form.modelType}
                      onChange={(event) => {
                        setForm({ ...form, modelType: event.target.value as ModelType })
                        clearFormTest()
                      }}
                    >
                      {(Object.keys(MODEL_TYPE_LABELS) as ModelType[]).map((type) => (
                        <option key={type} value={type}>
                          {MODEL_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Foreslått ut fra navnet. gpt-5 og nyere er reasoning.</p>
                  </div>
                  {form.modelType === 'reasoning' && (
                    <div className="space-y-1">
                      <Label htmlFor="model-effort">Hvor mye modellen tenker</Label>
                      <select
                        id="model-effort"
                        className={selectClassName}
                        value={form.reasoningEffort}
                        onChange={(event) => {
                          setForm({ ...form, reasoningEffort: event.target.value })
                          clearFormTest()
                        }}
                      >
                        {REASONING_EFFORTS.map((effort) => (
                          <option key={effort} value={effort}>
                            {EFFORT_LABELS[effort]}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">Mer tenking gir bedre svar, men elevene venter lenger.</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="model-api-version">API-versjon</Label>
                    <Input
                      id="model-api-version"
                      value={form.apiVersion}
                      onChange={(event) => {
                        setForm({ ...form, apiVersion: event.target.value.trim() })
                        clearFormTest()
                      }}
                    />
                    <p className="text-xs text-gray-500">«v1» fungerer for nye modeller.</p>
                  </div>
                </div>

                {testResults.form && <TestResults results={testResults.form} />}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!form.deployment || testingKey !== null}
                    onClick={() => test('form', form)}
                  >
                    {testingKey === 'form' ? 'Tester…' : 'Test'}
                  </Button>
                  <Button disabled={isPending || !form.deployment || !formTestOk} onClick={() => save(true)}>
                    Lagre og ta i bruk
                  </Button>
                  <Button variant="outline" disabled={isPending || !form.deployment} onClick={() => save(false)}>
                    Bare lagre
                  </Button>
                  <Button variant="ghost" disabled={isPending} onClick={() => setForm(null)}>
                    Avbryt
                  </Button>
                </div>
                {!formTestOk && form.deployment && (
                  <p className="text-xs text-gray-500">«Lagre og ta i bruk» blir tilgjengelig når testen er OK.</p>
                )}
              </div>
            ) : (
              <Button variant="outline" onClick={() => setForm(emptyForm())}>
                Legg til modell
              </Button>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
