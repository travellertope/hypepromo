import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const PROTECTED = ['/creator', '/advertiser', '/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  // /auth/callback must reach its handler even with a session present — that
  // request is what completes the OAuth exchange.
  const isAuthPage = pathname.startsWith('/auth') && !pathname.startsWith('/auth/callback')

  // getUser() is a network round-trip to Supabase on every single request it
  // runs on. Next prefetches every <Link> in view, so leaving it unguarded
  // meant one round-trip per prefetch — five per dashboard page from BottomNav
  // alone — serialised ahead of the navigation. Only pay it when the answer
  // can actually change what we return, and never for a prefetch, since the
  // real navigation that follows is still checked.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'

  if ((!isProtected && !isAuthPage) || isPrefetch) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const role = pathname.startsWith('/creator')
      ? 'creator'
      : pathname.startsWith('/advertiser')
        ? 'advertiser'
        : 'admin'
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('role', role)
    return NextResponse.redirect(loginUrl)
  }

  // Already authed users visiting auth pages → send them home
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/creator/:path*', '/advertiser/:path*', '/admin/:path*', '/auth/:path*'],
}
