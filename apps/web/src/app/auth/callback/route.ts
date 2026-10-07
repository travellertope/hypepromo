import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const role = (data.user.user_metadata?.['role'] as string | undefined) ?? searchParams.get('role') ?? undefined
      const dest =
        role === 'creator' ? '/creator' :
        role === 'advertiser' ? '/advertiser' :
        role === 'admin' ? '/admin' :
        next

      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
