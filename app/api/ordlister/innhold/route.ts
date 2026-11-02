import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers'
import { azureChatCompletion, isAzureConfigured } from '@/lib/ai/azure'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Writes the text «Lær ord» needs for each word in a teacher's list:
// inflection, English meaning, translations to the students' first
// languages and a short example sentence with the word in [brackets].

const schema = z.object({
  languages: z.array(z.string().trim().min(1).max(40)).max(12),
  words: z
    .array(
      z.object({
        word: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).optional(),
      })
    )
    .min(1)
    .max(30),
})

const SYSTEM_PROMPT = `Du lager innhold til en ordtrener for elever som lærer norsk (bokmål) som andrespråk, nivå A1–A2.
For hvert ord du får, skal du gi:
- "ord": ordet slik det står, rettet for skrivefeil. Substantiv uten artikkel.
- "boying": bøyning på bokmål. Substantiv: "en/ei/et ord, bestemt form, flertall" (for hunkjønn: "ei/en jente, jenta/jenten, jenter"). Verb: "å spise, spiser, spiste, har spist". Adjektiv: "stor, stort, store". Andre ord: ordklassen.
- "en": betydningen på engelsk, ett til tre ord.
- "oversettelser": ordet oversatt til hvert av de oppgitte språkene, skrevet med språkets eget skriftsystem. Bruk nøyaktig språknavnene du får som nøkler.
- "s": én kort, enkel og naturlig eksempelsetning på bokmål (4–8 ord) med ordet i hakeparentes, for eksempel "Jeg spiser et [eple].". Ordet i parentesen kan være bøyd.
Hvis læreren har gitt en beskrivelse, bruk den til å forstå hvilken betydning som er ment.`

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 20, 60000)
  if (limited) return limited

  try {
    if (!isAzureConfigured()) throw new Error('Azure OpenAI er ikke satt opp.')
    const { languages, words } = schema.parse(await req.json())

    const translationProps = Object.fromEntries(languages.map((l) => [l, { type: 'string' }]))
    const responseSchema = {
      type: 'object',
      properties: {
        ord: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ord: { type: 'string' },
              boying: { type: 'string' },
              en: { type: 'string' },
              oversettelser: {
                type: 'object',
                properties: translationProps,
                required: languages,
                additionalProperties: false,
              },
              s: { type: 'string' },
            },
            required: ['ord', 'boying', 'en', 'oversettelser', 's'],
            additionalProperties: false,
          },
        },
      },
      required: ['ord'],
      additionalProperties: false,
    }

    const list = words
      .map((w, i) => `${i + 1}. ${w.word}${w.description ? ` (lærerens beskrivelse: ${w.description})` : ''}`)
      .join('\n')

    const response = await azureChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Språk for oversettelse: ${languages.length ? languages.join(', ') : '(ingen)'}\n\nOrd, i denne rekkefølgen (svar med like mange ord i samme rekkefølge):\n${list}`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 4000,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ordliste_innhold', strict: true, schema: responseSchema },
      },
    })

    if (!response.ok) throw new Error(`Språkmodellen svarte ${response.status}`)
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error('Tomt svar fra språkmodellen')
    validateResponseSize(content, 100000)

    const parsed = JSON.parse(content) as {
      ord: { ord: string; boying: string; en: string; oversettelser: Record<string, string>; s: string }[]
    }
    if (parsed.ord.length !== words.length) throw new Error('Språkmodellen ga feil antall ord')

    return NextResponse.json({ words: parsed.ord })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    console.error('ordlister/innhold:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Kunne ikke lage innhold til ordene.' }, { status: 500 })
  }
}
