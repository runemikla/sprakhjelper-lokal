import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { requireTeacher } from '@/lib/auth/require-teacher'
import {
  isValidAccessCode,
  MAX_LISTENING_TASKS,
  normalizeAccessCode,
} from '@/lib/lytteoving'
import { sanitizeContent } from '@/lib/sanitize'
import { createClient, getUser } from '@/lib/supabase/server'

const codeSchema = z.string().transform(normalizeAccessCode).refine(isValidAccessCode)

interface RouteContext {
  params: Promise<{ code: string }>
}

interface RpcTask {
  position: number
  original_text: string
  audio_base64: string
  audio_mime_type: string
  questions: { question: string }[]
}

function mapTasks(tasks: RpcTask[] | undefined, isOwner: boolean) {
  return (tasks ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((task) => ({
      position: task.position,
      originalText: isOwner ? task.original_text : undefined,
      questions: (task.questions ?? [])
        .map((item) => ({ question: item.question?.trim() ?? '' }))
        .filter((item) => item.question.length > 0),
      audioBase64: task.audio_base64,
      audioMimeType: task.audio_mime_type,
    }))
    .filter((task) => Boolean(task.audioBase64) && task.questions.length > 0)
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
        tasks: RpcTask[]
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

  const tasks = mapTasks(exercise.tasks, isOwner)
  if (tasks.length === 0) {
    return NextResponse.json(
      { error: 'Fant ingen lytteøving med denne koden.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    accessCode: exercise.access_code,
    tasks,
    isOwner,
  })
}

const updateQuestionsSchema = z.object({
  taskPosition: z.number().int().min(1).max(MAX_LISTENING_TASKS).default(1),
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
      p_task_position: parsed.taskPosition,
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
