import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers'
import { requireTeacher } from '@/lib/auth/require-teacher'
import { textToSpeech, ElevenLabsError } from '@/lib/elevenlabs'
import { sanitizeContent } from '@/lib/sanitize'

export const maxDuration = 60

const generateQuestionsSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Tekst er påkrevd')
    .max(1000, 'Teksten kan være maks 1000 tegn'),
  questionCount: z.number().int().min(1).max(10),
})

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview'

interface ListeningQuestion {
  question: string
}

async function generateQuestions(
  originalText: string,
  questionCount: number
): Promise<ListeningQuestion[]> {
  const systemPrompt = `Du lager lytteøvinger for elever som lærer norsk som andrespråk. Eleven skal høre en tekst og svare på spørsmål som sjekker om de har forstått innholdet.

##Oppgave
Lag nøyaktig ${questionCount} spørsmål på bokmål til teksten eleven limer inn.

##Krav
- Spørsmålene skal teste forståelse av innholdet, ikke grammatikk.
- Bruk enkelt, tydelig språk.
- Spørsmålene skal kunne besvares ut fra teksten alene.
- Varier spørsmålstypene (hvem, hva, hvor, når, hvorfor) når teksten gir grunnlag for det.
- Ikke lag spørsmål som krever kunnskap utenfor teksten.
- Ikke lag fasitsvar. Returner bare spørsmålene.

##Utdata
Returner JSON med:
- "originalText": den opprinnelige teksten uendret
- "questions": en liste med nøyaktig ${questionCount} objekter, hvert med "question"`

  const responseSchema = {
    type: 'object',
    properties: {
      originalText: {
        type: 'string',
        description: 'Den opprinnelige teksten slik eleven limte den inn.',
      },
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Et forståelsesspørsmål til teksten.',
            },
          },
          required: ['question'],
          additionalProperties: false,
        },
      },
    },
    required: ['originalText', 'questions'],
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
          content: `Lag ${questionCount} forståelsesspørsmål til denne teksten:\n\n${originalText}`,
        },
      ],
      temperature: 0.4,
      max_completion_tokens: 2000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'listening_questions',
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

  const data = await response.json()
  const aiResponse = data.choices?.[0]?.message?.content?.trim()

  if (!aiResponse) {
    throw new Error('Empty response from Azure OpenAI')
  }

  validateResponseSize(aiResponse, 20000)

  const parsed = JSON.parse(aiResponse) as {
    questions: { question: string }[]
  }

  return (parsed.questions ?? [])
    .slice(0, questionCount)
    .map((item) => ({
      question: sanitizeContent(item.question ?? ''),
    }))
    .filter((item) => item.question.length > 0)
}

export async function POST(req: Request) {
  try {
    const rateLimitError = checkRateLimit(req, 10, 60000)
    if (rateLimitError) return rateLimitError

    const { error: teacherError } = await requireTeacher()
    if (teacherError) return teacherError

    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error(
        'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env'
      )
    }

    const body = await req.json()
    const { text, questionCount } = generateQuestionsSchema.parse(body)
    const originalText = sanitizeContent(text)

    const [questions, audioBuffer] = await Promise.all([
      generateQuestions(originalText, questionCount),
      textToSpeech(originalText),
    ])

    return NextResponse.json({
      success: true,
      originalText,
      questions,
      audioBase64: audioBuffer.toString('base64'),
      audioMimeType: 'audio/mpeg',
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Generate listening questions API error:',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof ElevenLabsError) {
      return NextResponse.json(
        { error: error.message, message: error.message },
        { status: error.status }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'An error occurred processing your request',
      },
      { status: 500 }
    )
  }
}
