import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { requireTeacher } from '@/lib/auth/require-teacher'
import { sanitizeContent } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'
import {
  mapSavedExercise,
  MAX_LISTENING_TASKS,
  QUESTION_TYPE,
  normalizeQuestionType,
  type ListeningExerciseListRow,
} from '@/lib/lytteoving'

const listeningQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    questionType: z
      .enum([QUESTION_TYPE.open, QUESTION_TYPE.statement])
      .optional(),
    isTrue: z.boolean().optional().nullable(),
  })
  .superRefine((item, ctx) => {
    if (
      normalizeQuestionType(item.questionType) === QUESTION_TYPE.statement &&
      typeof item.isTrue !== 'boolean'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Påstander må ha fasit (sant eller usant).',
        path: ['isTrue'],
      })
    }
  })

const taskSchema = z.object({
  originalText: z
    .string()
    .trim()
    .min(1, 'Tekst er påkrevd')
    .max(1000, 'Teksten kan være maks 1000 tegn'),
  audioBase64: z.string().min(1, 'Lyd er påkrevd'),
  audioMimeType: z.string().default('audio/mpeg'),
  questions: z.array(listeningQuestionSchema).min(1).max(10),
})

const saveExerciseSchema = z.object({
  tasks: z.array(taskSchema).min(1).max(MAX_LISTENING_TASKS),
})

const LIST_SELECT =
  'id, access_code, created_at, listening_tasks(position, original_text)'

export async function GET() {
  const { user, error } = await requireTeacher()
  if (error) return error

  const supabase = await createClient()
  const { data, error: queryError } = await supabase
    .from('listening_exercises')
    .select(LIST_SELECT)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json(
      { error: 'Kunne ikke hente lytteøvinger.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    exercises: ((data ?? []) as ListeningExerciseListRow[]).map(mapSavedExercise),
  })
}

export async function POST(req: Request) {
  const rateLimitError = checkRateLimit(req, 10, 60000)
  if (rateLimitError) return rateLimitError

  const { error } = await requireTeacher()
  if (error) return error

  try {
    const body = await req.json()
    const parsed = saveExerciseSchema.parse(body)
    const supabase = await createClient()

    const { data, error: saveError } = await supabase.rpc(
      'save_listening_exercise',
      {
        p_tasks: parsed.tasks.map((task) => ({
          original_text: sanitizeContent(task.originalText),
          audio_base64: task.audioBase64,
          audio_mime_type: task.audioMimeType,
          questions: task.questions.map((item) => {
            const questionType = normalizeQuestionType(item.questionType)
            return {
              question: sanitizeContent(item.question),
              question_type: questionType,
              is_true:
                questionType === QUESTION_TYPE.statement ? item.isTrue : null,
            }
          }),
        })),
      }
    )

    const savedRow = Array.isArray(data) ? data[0] : data
    if (saveError || !savedRow) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Save listening exercise error:', saveError?.message)
      }
      return NextResponse.json(
        { error: 'Kunne ikke lagre lytteøvingen. Prøv igjen.' },
        { status: 500 }
      )
    }

    const saved = savedRow as { exercise_id: number; exercise_code: string }

    return NextResponse.json({
      success: true,
      id: saved.exercise_id,
      accessCode: saved.exercise_code,
    })
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

const deleteExerciseSchema = z.object({
  id: z.number().int().positive(),
})

export async function DELETE(req: Request) {
  const { user, error } = await requireTeacher()
  if (error) return error

  try {
    const body = await req.json()
    const { id } = deleteExerciseSchema.parse(body)
    const supabase = await createClient()

    const { data, error: deleteError } = await supabase
      .from('listening_exercises')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id)
      .select('id')
      .maybeSingle()

    if (deleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete listening exercise error:', deleteError.message)
      }
      return NextResponse.json(
        { error: 'Kunne ikke slette lytteøvingen. Prøv igjen.' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Fant ikke lytteøvingen.' },
        { status: 404 }
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
