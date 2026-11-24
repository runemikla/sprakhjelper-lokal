import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { ChatModelError, chatbotModel, chatbotReply, isChatModelConfigured } from '@/lib/snakkebot/server'

// For admins: open /api/snakkebot/sjekk in the browser to see which Azure
// deployment Snakkebot uses and whether it answers.
export async function GET() {
  if (!(await isAdmin(await getUser()))) {
    return NextResponse.json({ error: 'Bare for administratorer.' }, { status: 403 })
  }
  const config = chatbotModel()
  const settings = {
    leverandor: process.env.CHATBOT_PROVIDER?.trim() || 'azure',
    deployment: config.deployment,
    apiVersjon: config.apiVersion,
    modelltype: config.modelType,
    reasoningEffort: config.reasoningEffort,
    endepunkt: config.endpoint ? new URL(config.endpoint).host : '(mangler AZURE_OPENAI_ENDPOINT)',
    nokkel: config.apiKey ? 'satt' : '(mangler AZURE_OPENAI_API_KEY)',
  }
  if (!isChatModelConfigured()) return NextResponse.json({ ok: false, innstillinger: settings })

  const started = Date.now()
  try {
    const svar = await chatbotReply(
      { id: 'sjekk', name: 'Test', description: '', instructions: 'Du er en vennlig samtalepartner.', greeting: '', voice: 'Erinome', level: 'A2', accessCode: 'TEST', groupIds: [] },
      [{ role: 'user', content: 'Hei! Hvordan har du det?' }]
    )
    return NextResponse.json({ ok: true, sekunder: (Date.now() - started) / 1000, svar, innstillinger: settings })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      sekunder: (Date.now() - started) / 1000,
      hint: error instanceof ChatModelError ? error.hint : undefined,
      feil: error instanceof Error ? error.message : String(error),
      innstillinger: settings,
    })
  }
}
