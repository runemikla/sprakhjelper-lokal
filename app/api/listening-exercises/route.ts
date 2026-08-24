import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { requireTeacher } from '@/lib/auth/require-teacher'
import { sanitizeContent } from '@/lib/sanitize'
import { createClient } from '@/lib/supabase/server'
import { previewText } from '@/lib/lytteoving'

const saveExerciseSchema = z.object({
  originalText: z
    .string()
    .trim()
    .min(1, 'Tekst er påkrevd')
    .max(1000, 'Teksten kan være maks 1000 tegn'),
  audioBase64: z.string().min(1, 'Lyd er påkrevd'),
  audioMimeType: z.string().default('audio/mpeg'),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(10),
})

export async function GET() {
  const { user, error } = await requireTeacher()
  if (error) return error

  const supabase = await createClient()
  const { data, error: queryError } = await supabase
    .from('listening_exercises')
    .select('id, access_code, original_text, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json(
      { error: 'Kunne ikke hente lytteøvinger.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    exercises: (data ?? []).map((row) => ({
      id: row.id,
      accessCode: row.access_code,
      originalText: previewText(row.original_text),
      createdAt: row.created_at,
    })),
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
        p_original_text: sanitizeContent(parsed.originalText),
        p_audio_base64: parsed.audioBase64,
        p_audio_mime_type: parsed.audioMimeType,
        p_questions: parsed.questions.map((item) => ({
          question: sanitizeContent(item.question),
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
