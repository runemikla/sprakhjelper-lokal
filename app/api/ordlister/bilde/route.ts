import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/api-helpers'
import { generateImage, ImageGenerationError, isImageModelConfigured } from '@/lib/ai/google-image'
import { requireTeacher } from '@/lib/ordlister/require-teacher'

// Draws one picture for a word in a teacher's list.

const schema = z.object({
  word: z.string().trim().min(1).max(80),
  // The list's title, e.g. «Lunsj i kantinen».
  theme: z.string().trim().max(120).optional(),
  // Concrete English description of what to draw (written by the language
  // model from the word, the theme and the teacher's description).
  motif: z.string().trim().min(1).max(400),
})

// Lets the editor tell the teacher whether pictures can be made at all.
export async function GET() {
  return NextResponse.json({ available: isImageModelConfigured() })
}

export async function POST(req: Request) {
  const denied = await requireTeacher()
  if (denied) return denied
  const limited = checkRateLimit(req, 120, 60000)
  if (limited) return limited

  try {
    const { word, theme, motif } = schema.parse(await req.json())
    // Same style prompt as the built-in «Lær ord» pictures (see
    // «Slik lages ordbildene»), so teachers' pictures match the set.
    const prompt = [
      'A simple, friendly flat vector illustration for a language-learning flashcard.',
      theme ? `Theme: ${theme}.` : '',
      `Show: ${motif} (Norwegian word: '${word}').`,
      'One clear subject centered, soft pastel colors, plain white background, no text, no letters, no numbers, no logos. Consistent style for teenagers.',
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
