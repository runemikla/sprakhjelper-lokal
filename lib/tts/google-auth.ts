import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

interface ServiceAccount {
  client_email: string
  private_key: string
}

let cachedToken: { value: string; expiresAt: number } | null = null

/**
 * Reads the service account key from GOOGLE_TTS_CREDENTIALS. The value can be
 * the key file's JSON as is, or the same JSON encoded as base64.
 */
function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_TTS_CREDENTIALS?.trim()
  if (!raw) return null

  const json = raw.startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  const parsed = JSON.parse(json) as Partial<ServiceAccount>
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'GOOGLE_TTS_CREDENTIALS must be a service account key with client_email and private_key'
    )
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

/**
 * Returns an OAuth access token for the service account in
 * GOOGLE_TTS_CREDENTIALS, or null when it is not set.
 */
export async function getServiceAccountToken(): Promise<string | null> {
  const account = readServiceAccount()
  if (!account) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.value
  }

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const signature = base64Url(signer.sign(account.private_key))

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    error_description?: string
  } | null

  if (!response.ok || !data?.access_token) {
    throw new Error(
      `Kunne ikke logge inn hos Google: ${data?.error_description ?? response.status}`
    )
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  }
  return cachedToken.value
}
