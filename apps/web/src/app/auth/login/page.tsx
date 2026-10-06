'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'creator'

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Normalise to E.164: assume Nigeria (+234) if no country code
    const normalised = phone.startsWith('+')
      ? phone.trim()
      : `+234${phone.trim().replace(/^0/, '')}`

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalised,
      options: {
        data: { role }, // picked up by the DB trigger
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    // Store normalised phone for the verify step
    sessionStorage.setItem('otp_phone', normalised)
    router.push(`/auth/verify?role=${role}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm">
        <h1 className="font-extrabold text-2xl text-cyber-neon mb-1">
          {role === 'advertiser' ? 'Advertiser sign in' : 'Creator sign in'}
        </h1>
        <p className="text-purple-300 text-sm mb-6">
          Enter your Nigerian phone number — we&apos;ll send a one-time code.
        </p>

        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          <div className="flex rounded-2xl overflow-hidden border border-cyber-border focus-within:border-cyber-neon transition">
            <span className="bg-cyber-card px-4 flex items-center text-purple-300 text-sm font-semibold shrink-0">
              +234
            </span>
            <input
              type="tel"
              placeholder="0801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-purple-400 text-sm outline-none"
              required
              autoComplete="tel"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-cyber-accent text-white font-bold py-3 disabled:opacity-50 transition hover:opacity-90"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-purple-400">
          {role === 'advertiser' ? (
            <>Creator?{' '}
              <a href="/auth/login?role=creator" className="text-cyber-neon underline">
                Switch
              </a>
            </>
          ) : (
            <>Advertiser?{' '}
              <a href="/auth/login?role=advertiser" className="text-cyber-neon underline">
                Switch
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  )
}
