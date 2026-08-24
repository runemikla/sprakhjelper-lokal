import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/lytteoving'
import { sanitizeContent } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const codeSchema = z.string().transform(normalizeAccessCode).refine(isValidAccessCode)

const checkAnswersSchema = z.object({
  answers: z.array(z.string().max(500)).min(1).max(10),
})

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview'

interface RouteContext {
  params: Promise<{ code: string }>
}

interface ExerciseRow {
  original_text: string
  questions: { question: string }[]
}

export async function POST(req: Request, { params }: RouteContext) {
  const rateLimitError = checkRateLimit(req, 10, 60000)
  if (rateLimitError) return rateLimitError

  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    return NextResponse.json(
      { error: 'Azure OpenAI configuration missing.' },
      { status: 500 }
    )
  }

  const { code } = await params
  const parsedCode = codeSchema.safeParse(code)
  if (!parsedCode.success) {
    return NextResponse.json(
      { error: 'Ugyldig kode. Koden skal ha 4 tegn.' },
      { status: 400 }
    )
  }

  try {
    const body = await req.json()
    const { answers } = checkAnswersSchema.parse(body)
    const studentAnswers = answers.map((answer) => sanitizeContent(answer.trim()))

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_listening_exercise_by_code', {
      p_access_code: parsedCode.data,
    })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Lookup listening exercise error:', error.message)
      }
      return NextResponse.json(
        { error: 'Kunne ikke hente lytteøvingen. Prøv igjen.' },
        { status: 500 }
      )
    }

    const exercise = (Array.isArray(data) ? data[0] : data) as ExerciseRow | undefined
    if (!exercise) {
      return NextResponse.json(
        { error: 'Fant ingen lytteøving med denne koden.' },
        { status: 404 }
      )
    }

    const questions = (exercise.questions ?? [])
      .map((item) => item.question)
      .filter((question) => question.length > 0)

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Lytteøvingen har ingen spørsmål.' },
        { status: 400 }
      )
    }

    if (studentAnswers.length !== questions.length) {
      return NextResponse.json(
        { error: 'Antall svar må være det samme som antall spørsmål.' },
        { status: 400 }
      )
    }

    const numberedQuestions = questions
      .map((question, index) => {
        const studentAnswer = studentAnswers[index] || '(tomt svar)'
        return `${index + 1}. Spørsmål: ${question}\n   Elevens svar: ${studentAnswer}`
      })
      .join('\n')

    const systemPrompt = `Du vurderer svar fra elever som lærer norsk som andrespråk. Eleven har hørt en tekst og svart på spørsmål om innholdet.

##Oppgave
Vurder hvert elevsvar opp mot originalteksten. Det finnes ikke et lagret fasitsvar.

##Krav
- Et svar er riktig hvis det viser at eleven har forstått det spørsmålet spør om, ut fra teksten.
- Godta meningslike svar, korte svar og små skrivefeil.
- Et tomt svar er alltid feil.
- Ikke krev identisk ordlyd med teksten.
- Skriv tilbakemelding på enkelt bokmål. Maks 25 ord.
- Vær vennlig og oppmuntrende.
- Hvis svaret er feil: hint mot hva i teksten eleven skal lytte etter. Ikke skriv av hele den relevante setningen fra originalteksten.

##Utdata
Returner JSON med "results": en liste med nøyaktig ett objekt per spørsmål, i samme rekkefølge, hvert med:
- "isCorrect": true eller false
- "feedback": kort tilbakemelding til eleven`

    const responseSchema = {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          minItems: questions.length,
          maxItems: questions.length,
          items: {
            type: 'object',
            properties: {
              isCorrect: {
                type: 'boolean',
                description: 'Om elevens svar er riktig ut fra originalteksten.',
              },
              feedback: {
                type: 'string',
                description: 'Kort, vennlig tilbakemelding på bokmål.',
              },
            },
            required: ['isCorrect', 'feedback'],
            additionalProperties: false,
          },
        },
      },
      required: ['results'],
      additionalProperties: false,
    }

    const azureUrl = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_API_VERSION}`

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Originaltekst:\n${exercise.original_text}\n\n${numberedQuestions}`,
          },
        ],
        temperature: 0.2,
        max_completion_tokens: 1500,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'listening_answer_check',
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    })

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Azure OpenAI error status:', response.status)
      }
      throw new Error(
        `Azure OpenAI API error: ${response.status} ${response.statusText}`
      )
    }

    const dataJson = await response.json()
    const aiResponse = dataJson.choices?.[0]?.message?.content?.trim()
    if (!aiResponse) {
      throw new Error('Empty response from Azure OpenAI')
    }

    validateResponseSize(aiResponse, 20000)

    const parsed = JSON.parse(aiResponse) as {
      results: { isCorrect: boolean; feedback: string }[]
    }

    const results = questions.map((_, index) => {
      const item = parsed.results?.[index]
      return {
        isCorrect: Boolean(item?.isCorrect),
        feedback: sanitizeContent(
          item?.feedback?.trim() ||
            (item?.isCorrect ? 'Flott!' : 'Prøv å lytte én gang til.')
        ),
      }
    })

    const correctCount = results.filter((item) => item.isCorrect).length

    return NextResponse.json({
      success: true,
      results,
      correctCount,
      totalCount: questions.length,
    })
  } catch (caught) {
    if (caught instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: caught.errors },
        { status: 400 }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Check listening answers error:',
        caught instanceof Error ? caught.message : 'Unknown error'
      )
    }

    return NextResponse.json(
      { error: 'Kunne ikke sjekke svarene. Prøv igjen.' },
      { status: 500 }
    )
  }
}
