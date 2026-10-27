import { redirect } from 'next/navigation'
import { AppNavbar } from '@/components/landing/app-navbar'
import { Footer } from '@/components/landing/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUser } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/roles'
import { TRANSFER_ERRORS } from '@/lib/ai/transfer-errors'
import {
  buildSpraakhjelperSystemPrompt,
  buildCheckSentenceSystemPrompt,
  SPLIT_SENTENCES_SYSTEM_PROMPT,
  buildSummarySystemPrompt,
  buildWordOrderSystemPrompt,
  buildOpenQuestionsPrompt,
  buildStatementPrompt,
  LEVEL_SPECS,
  LISTENING_ANSWER_CHECK_SYSTEM_PROMPT,
} from '@/lib/ai/instructions'

// Placeholders that stand in for the dynamic values the model receives at
// runtime (mother language, level, question count, etc.). They make it clear on
// the page which parts of the instruction change per request.
const MORSMAAL = '{elevens morsmål}'
const TRANSFER_PLACEHOLDER =
  '{overføringsfeil for valgt morsmål – se listen «Overføringsfeil per språk» nederst}'
const SENTENCE = '{elevens setning}'
const CORRECT_SENTENCE = '{fasitsetning}'
const LEVEL_INSTRUCTION = '{nivåspesifikasjon – se «Nivåspesifikasjoner» under}'
const QUESTION_COUNT = '{antall}'

// Build a readable dump of the transfer-error lists, keyed by language value.
const transferErrorsText = Object.entries(TRANSFER_ERRORS)
  .map(([key, value]) => `[${key}]\n${value}`)
  .join('\n\n')

// Build a readable dump of the 7 word-order difficulty levels.
const levelSpecsText = Object.entries(LEVEL_SPECS)
  .map(([level, spec]) => `Nivå ${level}: ${spec}`)
  .join('\n\n')

// Grouped instructions, one group per AI tool. Each item is rendered in a
// collapsible <details> block so long prompts stay scannable.
interface InstructionItem {
  title: string
  description?: string
  content: string
}

interface InstructionGroup {
  tool: string
  description: string
  items: InstructionItem[]
}

const INSTRUCTION_GROUPS: InstructionGroup[] = [
  {
    tool: 'Skrivehjelp',
    description:
      'Systeminstrukser bak skrivehjelpen: hovedanalyse, setningsdeling, setningssjekk og sammendrag.',
    items: [
      {
        title: 'Hovedanalyse (setning for setning)',
        description: 'app/api/spraakhjelper-azure',
        content: buildSpraakhjelperSystemPrompt(MORSMAAL, TRANSFER_PLACEHOLDER),
      },
      {
        title: 'Setningsdeling og tegnsetting',
        description: 'app/api/split-sentences-azure',
        content: SPLIT_SENTENCES_SYSTEM_PROMPT,
      },
      {
        title: 'Setningssjekk',
        description: 'app/api/check-sentence-azure',
        content: buildCheckSentenceSystemPrompt(MORSMAAL, SENTENCE, CORRECT_SENTENCE),
      },
      {
        title: 'Sammendrag / rapport',
        description: 'app/api/generate-summary-azure',
        content: buildSummarySystemPrompt(MORSMAAL),
      },
      {
        title: 'Overføringsfeil per språk',
        description: 'Listen som legges inn i hovedanalysen for valgt morsmål',
        content: transferErrorsText,
      },
    ],
  },
  {
    tool: 'Grammatikk øving',
    description: 'Systeminstrukser bak ordrekkefølge-øvingene.',
    items: [
      {
        title: 'Setningsgenerator (ordrekkefølge)',
        description: 'app/api/generate-sentence',
        content: buildWordOrderSystemPrompt(LEVEL_INSTRUCTION, ''),
      },
      {
        title: 'Nivåspesifikasjoner',
        description: 'De 7 vanskelighetsnivåene som settes inn i «##Nivå»',
        content: levelSpecsText,
      },
    ],
  },
  {
    tool: 'Lytteøving',
    description:
      'Systeminstrukser bak lytteøvingene: spørsmålsgenerering og automatisk vurdering av elevsvar.',
    items: [
      {
        title: 'Åpne spørsmål',
        description: 'app/api/generate-listening-questions',
        content: buildOpenQuestionsPrompt(QUESTION_COUNT),
      },
      {
        title: 'Sant/usant-påstander',
        description: 'app/api/generate-listening-questions',
        content: buildStatementPrompt(QUESTION_COUNT),
      },
      {
        title: 'Vurdering av elevsvar',
        description: 'app/api/listening-exercises/[code]/check-answers',
        content: LISTENING_ANSWER_CHECK_SYSTEM_PROMPT,
      },
    ],
  },
]

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <AppNavbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 mt-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">Instrukser</h1>
            <p className="text-xl text-gray-600">
              Systeminstruksene bak KI-verktøyene. Deler i klammeparentes, som{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-base">
                {'{elevens morsmål}'}
              </code>
              , settes inn dynamisk per forespørsel.
            </p>
          </div>

          {/* One card per tool */}
          <div className="space-y-8">
            {INSTRUCTION_GROUPS.map((group) => (
              <Card key={group.tool}>
                <CardHeader>
                  <CardTitle className="text-2xl">{group.tool}</CardTitle>
                  <p className="text-sm text-gray-600">{group.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.items.map((item) => (
                    <details
                      key={item.title}
                      className="group rounded-lg border border-gray-200 bg-white"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-medium text-gray-800 hover:text-blue-600">
                        <span>
                          {item.title}
                          {item.description ? (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              {item.description}
                            </span>
                          ) : null}
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
