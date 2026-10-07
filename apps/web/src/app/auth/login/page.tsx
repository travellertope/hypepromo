'use client'

import { Suspense, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const otpRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'creator'

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { data: { role } },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
    setTimeout(() => otpRef.current?.focus(), 100)
  }

  function handleOtpInput(value: string) {
    const digits = value.replace(/\D/g, '')
    setOtp(digits)
  }

  async function verifyCode(code: string) {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })

    if (verifyError) {
      setError('Invalid or expired code. Try again.')
      setOtp('')
      otpRef.current?.focus()
      setLoading(false)
      return
    }

    router.replace(role === 'advertiser' ? '/advertiser' : role === 'admin' ? '/admin' : '/creator')
  }

  if (step === 'otp') {
    return (
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm text-center">
        <h1 className="font-extrabold text-2xl text-cyber-neon mb-1">Enter your code</h1>
        <p className="text-cyber-muted text-sm mb-6">
          We emailed a code to <span className="text-cyber-text font-medium">{email}</span>
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (otp.length >= 4) verifyCode(otp) }} className="flex flex-col gap-4">
          <input
            ref={otpRef}
            type="tel"
            inputMode="numeric"
            placeholder="Enter code"
            value={otp}
            onChange={(e) => handleOtpInput(e.target.value)}
            disabled={loading}
            autoComplete="one-time-code"
            className="rounded-2xl border border-cyber-border focus:border-cyber-neon bg-transparent px-4 py-3 text-cyber-text text-center text-2xl font-bold tracking-widest placeholder-cyber-muted outline-none transition disabled:opacity-50"
          />

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="rounded-2xl bg-cyber-accent text-white font-bold py-3 disabled:opacity-50 transition hover:opacity-90"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        {loading && <p className="text-cyber-muted text-sm animate-pulse mt-2">Verifying…</p>}

        <button
          onClick={() => { setStep('email'); setOtp(''); setError(null) }}
          className="mt-4 text-xs text-cyber-muted underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-3xl p-8 w-full max-w-sm">
      <h1 className="font-extrabold text-2xl text-cyber-neon mb-1">
        {role === 'advertiser' ? 'Advertiser sign in' : 'Creator sign in'}
      </h1>
      <p className="text-cyber-muted text-sm mb-6">
        Enter your email — we&apos;ll send a login code.
      </p>

      <form onSubmit={handleSend} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-2xl border border-cyber-border focus:border-cyber-neon bg-transparent px-4 py-3 text-cyber-text placeholder-cyber-muted text-sm outline-none transition"
          required
          autoComplete="email"
          autoFocus
        />

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-cyber-accent text-white font-bold py-3 disabled:opacity-50 transition hover:opacity-90"
        >
          {loading ? 'Sending…' : 'Send code'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-cyber-muted">
        {role === 'advertiser' ? (
          <>Creator?{' '}
            <a href="/auth/login?role=creator" className="text-cyber-neon underline">Switch</a>
          </>
        ) : (
          <>Advertiser?{' '}
            <a href="/auth/login?role=advertiser" className="text-cyber-neon underline">Switch</a>
          </>
        )}
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
