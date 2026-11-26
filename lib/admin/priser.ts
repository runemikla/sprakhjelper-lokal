// Estimated prices for the «Forbruk» admin page, in US dollars. These are
// estimates, not the invoice: the bill is in the Azure and Google Cloud
// portals. Update the numbers here when the prices change.
//
// Azure: EU Data Zone prices per million tokens (looked up 3 November 2026 for
// gpt-6.1-terra and gpt-4.1; the others are estimates).
// Google: list prices (Gemini API, Cloud Text-to-Speech, Speech-to-Text).

export interface TokenPrice {
  input: number
  cached: number
  output: number
  // True when the price is our own estimate, not a looked-up price.
  estimate?: boolean
}

// Per million tokens. Matched on the start of the model/deployment name.
const TOKEN_PRICES: [prefix: string, price: TokenPrice][] = [
  ['gpt-6.1-terra', { input: 1.2, cached: 0.06, output: 6 }],
  ['gpt-4.1-mini', { input: 0.44, cached: 0.11, output: 1.76, estimate: true }],
  ['gpt-4.1', { input: 2.2, cached: 0.55, output: 8.8 }],
  ['gpt-4o', { input: 2.75, cached: 1.38, output: 11, estimate: true }],
  // Gemini text and speech (speech output is billed as audio tokens).
  ['gemini-3.1-flash-tts', { input: 0.5, cached: 0.5, output: 10, estimate: true }],
  ['gemini-2.5-flash-preview-tts', { input: 0.5, cached: 0.5, output: 10, estimate: true }],
  ['gemini', { input: 0.3, cached: 0.03, output: 2.5, estimate: true }],
]

// Models we have no price for are counted like gpt-6.1-terra.
const FALLBACK_TOKEN_PRICE: TokenPrice = { input: 1.2, cached: 0.06, output: 6, estimate: true }

export function tokenPrice(model: string): TokenPrice {
  const name = model.toLowerCase()
  return TOKEN_PRICES.find(([prefix]) => name.startsWith(prefix))?.[1] ?? FALLBACK_TOKEN_PRICE
}

// Per picture (Gemini gemini-3.1-flash-lite-image, about 0.034 dollars).
export const PRICE_PER_IMAGE = 0.034

// Google Cloud Text-to-Speech per million characters, by voice type.
function pricePerMillionCharacters(voice: string): number {
  if (/Chirp3-HD|Chirp-HD/i.test(voice)) return 30
  if (/Wavenet|Neural2/i.test(voice)) return 16
  if (/Standard/i.test(voice)) return 4
  return 30
}

// Google Speech-to-Text per minute (Chirp 3 / v1 standard).
export const PRICE_PER_SPEECH_MINUTE = 0.016

export interface UsageNumbers {
  provider: string
  model: string
  kind: string
  input_tokens: number
  cached_tokens: number
  output_tokens: number
  units: number
}

/** Estimated cost in dollars for one row (a call or a daily total). */
export function estimateCost(row: UsageNumbers): number {
  if (row.kind === 'bilde') return row.units * PRICE_PER_IMAGE
  if (row.kind === 'tale') return (row.units / 60) * PRICE_PER_SPEECH_MINUTE
  if (row.kind === 'lyd' && row.provider === 'google') {
    return (row.units / 1_000_000) * pricePerMillionCharacters(row.model)
  }
  const price = tokenPrice(row.model)
  const cached = Math.min(row.cached_tokens, row.input_tokens)
  return (
    ((row.input_tokens - cached) * price.input + cached * price.cached + row.output_tokens * price.output) / 1_000_000
  )
}
