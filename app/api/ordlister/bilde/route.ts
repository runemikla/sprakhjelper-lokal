import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { generateImage, ImageGenerationError, isImageModelConfigured } from '@/lib/ai/google-image'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Draws one picture for a word in a teacher's list.

const schema = z.object({
  word: z.string().trim().min(1).max(80),
  meaning: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(),
})

// Lets the editor tell the teacher whether pictures can be made at all.
export async function GET() {
  return NextResponse.json({ available: isImageModelConfigured() })
}

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 30, 60000)
  if (limited) return limited

  try {
    const { word, meaning, description } = schema.parse(await req.json())
    const subject = meaning ? `«${word}» (${meaning})` : `«${word}»`
    const prompt = [
      `A simple, friendly illustration for a vocabulary card that teaches the Norwegian word ${subject}.`,
      description ? `What the picture should show: ${description}.` : '',
      'Flat, clear style with soft colours, one main subject in the centre, plain white background.',
      'No text, letters or numbers anywhere in the picture.',
    ]
      .filter(Boolean)
      .join(' ')

    const image = await generateImage(prompt)
    return new NextResponse(new Uint8Array(image.data), {
      headers: { 'Content-Type': image.mimeType, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }
    console.error('ordlister/bilde:', error instanceof Error ? error.message : error)
    const status = error instanceof ImageGenerationError ? error.status : 500
    return NextResponse.json(
      { error: status === 503 ? 'Ingen bildemodell er satt opp ennå.' : 'Kunne ikke lage bildet.' },
      { status }
    )
  }
}
