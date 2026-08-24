import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from '@/lib/supabase/env'

const ACCESS_COOKIE_NAME = 'spraakhjelper_access'

function isAccessCodeExempt(pathname: string) {
  return (
    pathname === '/tilgang' ||
    pathname === '/api/verify-access' ||
    pathname.startsWith('/auth/')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Access code gate for the app. Login is optional and is not required
  // for Språkhjelperen or grammatikkøving.
  if (!isAccessCodeExempt(pathname)) {
    const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)
    if (!accessCookie || accessCookie.value !== 'authenticated') {
      const url = request.nextUrl.clone()
      url.pathname = '/tilgang'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request })
  const { url, key } = getSupabaseEnv()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Keep optional sessions fresh. Do not run other logic before getUser().
  await supabase.auth.getUser()

  if (
    process.env.NODE_ENV === 'production' &&
    !request.headers.get('x-forwarded-proto')?.includes('https') &&
    !request.url.includes('localhost')
  ) {
    return NextResponse.redirect(request.url.replace('http://', 'https://'), 301)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
