// Image generation with Google's image models through the Gemini API.
// Used by «Ordlister» to draw one picture per word.
//
// Environment variables:
//   GEMINI_API_KEY      API key from Google AI Studio (required to turn
//                       pictures on). GOOGLE_API_KEY is accepted as well.
//   GEMINI_IMAGE_MODEL  defaults to gemini-2.5-flash-image. Imagen models
//                       (for example imagen-4.0-fast-generate-001) also work.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function imageConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '',
    model: process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image',
  }
}

export function isImageModelConfigured(): boolean {
  return Boolean(imageConfig().apiKey)
}

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

interface GeneratedImage {
  data: Buffer
  mimeType: string
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const { apiKey, model } = imageConfig()
  if (!apiKey) {
    throw new ImageGenerationError('Ingen bildemodell er satt opp (GEMINI_API_KEY).', 503)
  }

  const isImagen = model.startsWith('imagen')
  const url = `${API_BASE}/${encodeURIComponent(model)}:${isImagen ? 'predict' : 'generateContent'}`
  const body = isImagen
    ? { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }
    : {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new ImageGenerationError(
      `Bildemodellen svarte ${response.status}: ${detail.slice(0, 300)}`,
      response.status === 429 ? 429 : 502
    )
  }

  const payload = await response.json()

  if (isImagen) {
    const prediction = payload.predictions?.[0] as
      | { bytesBase64Encoded?: string; mimeType?: string }
      | undefined
    if (prediction?.bytesBase64Encoded) {
      return {
        data: Buffer.from(prediction.bytesBase64Encoded, 'base64'),
        mimeType: prediction.mimeType || 'image/png',
      }
    }
  } else {
    const parts = (payload.candidates?.[0]?.content?.parts ?? []) as {
      inlineData?: { data?: string; mimeType?: string }
    }[]
    const image = parts.find((p) => p.inlineData?.data)?.inlineData
    if (image?.data) {
      return { data: Buffer.from(image.data, 'base64'), mimeType: image.mimeType || 'image/png' }
    }
  }

  throw new ImageGenerationError('Bildemodellen sendte ikke noe bilde.', 502)
}
