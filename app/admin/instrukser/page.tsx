import Image from 'next/image'
import { AdminIntro, AdminNotice } from '@/components/admin/admin-intro'
import { VERKTOY_FARGE, VERKTOY_KANT } from '@/components/landing/verktoy-farger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth/require-admin-page'
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

// Each tool is colour coded with its VLFK profile colour (the same as on the
// tool cards), so it is easy to see which instructions belong to which tool.
interface ToolGroup {
  tool: string
  // Anchor id on this page.
  id: string
  // The tool's route; picks the colour from VERKTOY_FARGE.
  href: string
  image: string
  description: string
  references: ReferenceItem[]
}

const TOOLS: ToolGroup[] = [
  {
    tool: 'Skrivehjelp',
    id: 'skrivehjelp',
    href: '/spraakhjelper',
    image: '/images/verktoy/skrivehjelp.webp',
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
    tool: 'Grammatikkøving',
    id: 'grammatikkoving',
    href: '/grammatikk',
    image: '/images/verktoy/grammatikk.webp',
    description: 'Systeminstrukser bak «Øv på feilene dine» og ordrekkefølge-øvingene.',
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
    id: 'lytteoving',
    href: '/lytteoving',
    image: '/images/verktoy/lytteoving.webp',
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
  await requireAdminPage('/admin/instrukser')

  const versionsByKey = await loadVersions()
  const canEdit = versionsByKey !== null

  return (
    <div className="space-y-6">
      <AdminIntro
        title="Instrukser"
        description={
          <>
            Systeminstruksene bak KI-verktøyene. Du kan lagre egne versjoner og velge hvilken
            versjon hvert verktøy skal bruke. Deler i doble klammeparenteser, som{' '}
            <code className="rounded-sm bg-vlfk-surface-muted px-1 py-0.5">{'{{morsmaal}}'}</code>, settes
            inn per forespørsel.
          </>
        }
      />

      {!canEdit && (
        <AdminNotice>
          Fant ikke tabellen for instruksversjoner i databasen. Siden viser bare
          standardinstruksene til migrasjonen er kjørt.
        </AdminNotice>
      )}

      <nav aria-label="Verktøy" className="flex flex-wrap gap-2">
        {TOOLS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-vlfk-ink hover:ring-2 hover:ring-vlfk-ink/20 ${VERKTOY_FARGE[group.href]}`}
          >
            {group.tool}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {TOOLS.map((group) => (
          <Card
            key={group.tool}
            id={group.id}
            className={`scroll-mt-4 overflow-hidden border-l-4 sm:border-l-8 ${VERKTOY_KANT[group.href]}`}
          >
            <CardHeader className={`flex flex-row items-center gap-4 space-y-0 p-4 sm:p-6 ${VERKTOY_FARGE[group.href]}`}>
              <Image
                src={group.image}
                alt=""
                width={64}
                height={48}
                className="hidden h-12 w-16 shrink-0 rounded-md object-cover sm:block"
              />
              <div className="space-y-1">
                <CardTitle className="text-xl text-vlfk-ink sm:text-2xl">{group.tool}</CardTitle>
                <p className="text-sm text-vlfk-ink">{group.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-4 sm:p-6">
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
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-medium text-gray-800 hover:text-vlfk-ink">
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
  )
}
