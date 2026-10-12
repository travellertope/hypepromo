import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL']
  if (!apiUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL not set' }, { status: 500 })
  }

  try {
    const res = await fetch(`${apiUrl}/health`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'promoet-keepalive/1' },
    })
    const body = await res.json().catch(() => null)
    return NextResponse.json({ pinged: true, status: res.status, body })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ pinged: false, error: msg }, { status: 502 })
  }
}
