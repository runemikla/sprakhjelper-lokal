'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import {
  getEnvModelConfig,
  MODEL_TYPES,
  REASONING_EFFORTS,
  runModelChecks,
  type ModelCheckResult,
} from '@/lib/ai/azure-core'
import { clearModelCache } from '@/lib/ai/azure'

// Server actions behind the admin "Språkmodell" page. Every action re-checks
// the admin role here, and the database policies on ai_models check it again
// (public.is_admin()).

export type ActionResult = { ok: true } | { ok: false; error: string }

const settingsSchema = z.object({
  deployment: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,64}$/, 'Deployment-navnet kan bare ha bokstaver, tall, punktum, - og _'),
  apiVersion: z
    .string()
    .trim()
    .regex(/^(v1|\d{4}-\d{2}-\d{2}(-preview)?)$/, 'API-versjonen må være v1 eller en dato som 2025-04-01-preview'),
  modelType: z.enum(MODEL_TYPES as [string, ...string[]]),
  reasoningEffort: z.enum(REASONING_EFFORTS),
})

const createSchema = settingsSchema.extend({
  name: z.string().trim().min(1, 'Gi modellen et navn').max(200, 'Navnet er for langt'),
  activate: z.boolean(),
})

async function ensureAdmin(): Promise<string | null> {
  const user = await getUser()
  if (!user || !(await isAdmin(user))) return null
  return user.id
}

function done(): ActionResult {
  clearModelCache()
  revalidatePath('/sprakmodell')
  return { ok: true }
}

function firstError(error: z.ZodError): string {
  return error.errors[0]?.message ?? 'Ugyldig input'
}

export async function createAiModel(input: {
  name: string
  deployment: string
  apiVersion: string
  modelType: string
  reasoningEffort: string
  activate: boolean
}): Promise<ActionResult> {
  const userId = await ensureAdmin()
  if (!userId) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const { name, deployment, apiVersion, modelType, reasoningEffort, activate } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_models')
    .insert({
      name,
      deployment,
      api_version: apiVersion,
      model_type: modelType,
      reasoning_effort: reasoningEffort,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Create AI model error:', error?.message)
    return { ok: false, error: 'Kunne ikke lagre modellen.' }
  }

  if (activate) {
    const { error: activateError } = await supabase.rpc('activate_ai_model', {
      p_model_id: data.id,
    })
    if (activateError) {
      console.error('Activate AI model error:', activateError.message)
      revalidatePath('/sprakmodell')
      return { ok: false, error: 'Modellen ble lagret, men kunne ikke tas i bruk.' }
    }
  }

  return done()
}

// modelId null switches back to the model from the environment variables.
export async function activateAiModel(input: { modelId: string | null }): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = z.object({ modelId: z.string().uuid().nullable() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('activate_ai_model', { p_model_id: parsed.data.modelId })

  if (error) {
    console.error('Activate AI model error:', error.message)
    return { ok: false, error: 'Kunne ikke bytte modell.' }
  }

  return done()
}

export async function deleteAiModel(input: { modelId: string }): Promise<ActionResult> {
  if (!(await ensureAdmin())) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = z.object({ modelId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Ugyldig input' }

  const supabase = await createClient()
  // The active model cannot be deleted; switch to another model first.
  const { data, error } = await supabase
    .from('ai_models')
    .delete()
    .eq('id', parsed.data.modelId)
    .eq('is_active', false)
    .select('id')

  if (error) {
    console.error('Delete AI model error:', error.message)
    return { ok: false, error: 'Kunne ikke slette modellen.' }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Modellen er i bruk eller finnes ikke. Bytt til en annen modell først.' }
  }

  return done()
}

// Sends the same kinds of requests the tools send to the given deployment,
// without saving or activating anything.
export async function testAiModel(input: {
  deployment: string
  apiVersion: string
  modelType: string
  reasoningEffort: string
}): Promise<{ ok: true; results: ModelCheckResult[] } | { ok: false; error: string }> {
  if (!(await ensureAdmin())) return { ok: false, error: 'Bare administratorer har tilgang.' }

  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const envConfig = getEnvModelConfig()
  if (!envConfig.endpoint || !envConfig.apiKey) {
    return { ok: false, error: 'AZURE_OPENAI_ENDPOINT eller AZURE_OPENAI_API_KEY mangler i miljøvariablene.' }
  }

  const results = await runModelChecks({
    ...envConfig,
    deployment: parsed.data.deployment,
    apiVersion: parsed.data.apiVersion,
    modelType: parsed.data.modelType as 'standard' | 'reasoning',
    reasoningEffort: parsed.data.reasoningEffort,
  })
  return { ok: true, results }
}
