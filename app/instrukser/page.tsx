import { redirect } from 'next/navigation'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient, getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { TRANSFER_ERRORS } from '@/lib/ai/transfer-errors'
import { INSTRUCTION_DEFINITIONS, LEVEL_SPECS } from '@/lib/ai/instructions'
import { InstructionVersions, type InstructionVersion } from './instruction-versions'

// Admin pages always show the current versions from the database.
export const dynamic = 'force-dynamic'

// Build a readable dump of the transfer-error lists, keyed by language value.
const transferErrorsText = Object.entries(TRANSFER_ERRORS)
  .map(([key, value]) => `[${key}]\n${value}`)
  .join('\n\n')

// Build a readable dump of the 7 word-order difficulty levels.
const levelSpecsText = Object.entries(LEVEL_SPECS)
  .map(([level, spec]) => `Nivå ${level}: ${spec}`)
  .join('\n\n')

// One card per AI tool. The versionable instructions come from the catalog in
// lib/ai/instructions.ts; the reference lists below are shown read-only.
interface ReferenceItem {
  title: string
  description: string
  content: string
}

const TOOLS: { tool: string; description: string; references: ReferenceItem[] }[] = [
  {
    tool: 'Skrivehjelp',
    description:
      'Systeminstrukser bak skrivehjelpen: hovedanalyse, setningsdeling, setningssjekk og sammendrag.',
    references: [
      {
        title: 'Overføringsfeil per språk',
        description: 'Listen som settes inn som {{overforingsfeil}} i hovedanalysen (kun visning)',
        content: transferErrorsText,
      },
    ],
  },
  {
    tool: 'Grammatikk øving',
    description: 'Systeminstrukser bak ordrekkefølge-øvingene.',
    references: [
      {
        title: 'Nivåspesifikasjoner',
        description: 'De 7 vanskelighetsnivåene som settes inn som {{nivaa}} (kun visning)',
        content: levelSpecsText,
      },
    ],
  },
  {
    tool: 'Lytteøving',
    description:
      'Systeminstrukser bak lytteøvingene: spørsmålsgenerering og automatisk vurdering av elevsvar.',
    references: [],
  },
]

// Loads all saved versions, grouped by instruction key. Returns null when the
// table cannot be read (for example before the migration is applied).
async function loadVersions(): Promise<Record<string, InstructionVersion[]> | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instruction_versions')
    .select('id, instruction_key, name, content, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Load instruction versions error:', error.message)
    return null
  }

  const byKey: Record<string, InstructionVersion[]> = {}
  for (const { instruction_key, ...version } of data ?? []) {
    ;(byKey[instruction_key] ??= []).push(version)
  }
  return byKey
}

export default async function InstrukserPage() {
  const user = await getUser()

  // Server-side guard: only admins may view the instructions. Hiding the menu
  // item alone is not enough, so we re-check the role here.
  if (!user) {
    redirect('/auth/login?next=/instrukser')
  }

  if (!(await isAdmin(user))) {
    redirect('/')
  }

  const versionsByKey = await loadVersions()
  const canEdit = versionsByKey !== null

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">Instrukser</h1>
            <p className="text-xl text-gray-600">
              Systeminstruksene bak KI-verktøyene. Du kan lagre egne versjoner og velge
              hvilken versjon hvert verktøy skal bruke. Deler i doble klammeparenteser,
              som{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-base">
                {'{{morsmaal}}'}
              </code>
              , settes inn per forespørsel.
            </p>
          </div>

          {!canEdit && (
            <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Fant ikke tabellen for instruksversjoner i databasen. Siden viser bare
              standardinstruksene til migrasjonen er kjørt.
            </div>
          )}

          {/* One card per tool */}
          <div className="space-y-8">
            {TOOLS.map((group) => (
              <Card key={group.tool}>
                <CardHeader>
                  <CardTitle className="text-2xl">{group.tool}</CardTitle>
                  <p className="text-sm text-gray-600">{group.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {INSTRUCTION_DEFINITIONS.filter(
                    (definition) => definition.tool === group.tool
                  ).map((definition) => (
                    <InstructionVersions
                      key={definition.key}
                      instructionKey={definition.key}
                      title={definition.title}
                      route={definition.route}
                      variables={definition.variables}
                      defaultTemplate={definition.defaultTemplate}
                      versions={versionsByKey?.[definition.key] ?? []}
                      canEdit={canEdit}
                    />
                  ))}
                  {group.references.map((item) => (
                    <details
                      key={item.title}
                      className="group rounded-lg border border-gray-200 bg-white"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-medium text-gray-800 hover:text-blue-600">
                        <span>
                          {item.title}
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            {item.description}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-gray-400 transition-transform group-open:rotate-90"
                        >
                          ›
                        </span>
                      </summary>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
                        {item.content}
                      </pre>
                    </details>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
