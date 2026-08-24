import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { requireTeacher } from '@/lib/auth/require-teacher'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/lytteoving'
import { sanitizeContent } from '@/lib/sanitize'
import { createClient, getUser } from '@/lib/supabase/server'

const codeSchema = z.string().transform(normalizeAccessCode).refine(isValidAccessCode)

interface RouteContext {
  params: Promise<{ code: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const rateLimitError = checkRateLimit(_req, 20, 60000)
  if (rateLimitError) return rateLimitError

  const { code } = await params
  const parsed = codeSchema.safeParse(code)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ugyldig kode. Koden skal ha 4 tegn.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_listening_exercise_by_code', {
    p_access_code: parsed.data,
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

  const exercise = (Array.isArray(data) ? data[0] : data) as
    | {
        id: number
        access_code: string
        original_text: string
        audio_base64: string
        audio_mime_type: string
        questions: { question: string }[]
      }
    | undefined

  if (!exercise) {
    return NextResponse.json(
      { error: 'Fant ingen lytteøving med denne koden.' },
      { status: 404 }
    )
  }

  const user = await getUser()
  let isOwner = false
  if (user) {
    const { data: owned } = await supabase
      .from('listening_exercises')
      .select('id')
      .eq('id', exercise.id)
      .eq('created_by', user.id)
      .maybeSingle()
    isOwner = Boolean(owned)
  }

  return NextResponse.json({
    accessCode: exercise.access_code,
    originalText: isOwner ? exercise.original_text : undefined,
    questions: (exercise.questions ?? [])
      .map((item) => ({ question: item.question?.trim() ?? '' }))
      .filter((item) => item.question.length > 0),
    audioBase64: exercise.audio_base64,
    audioMimeType: exercise.audio_mime_type,
    isOwner,
  })
}

const updateQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(10),
})

export async function PATCH(req: Request, { params }: RouteContext) {
  const rateLimitError = checkRateLimit(req, 20, 60000)
  if (rateLimitError) return rateLimitError

  const { error: teacherError } = await requireTeacher()
  if (teacherError) return teacherError

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
    const parsed = updateQuestionsSchema.parse(body)
    const supabase = await createClient()

    const { error } = await supabase.rpc('update_listening_exercise_questions', {
      p_access_code: parsedCode.data,
      p_questions: parsed.questions.map((item) => ({
        question: sanitizeContent(item.question),
      })),
    })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Update listening questions error:', error.message)
      }
      const notFound = error.message.toLowerCase().includes('not found')
      return NextResponse.json(
        {
          error: notFound
            ? 'Fant ikke lytteøvingen, eller du har ikke tilgang til å endre den.'
            : 'Kunne ikke lagre endringene. Prøv igjen.',
        },
        { status: notFound ? 404 : 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (caught) {
    if (caught instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: caught.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
