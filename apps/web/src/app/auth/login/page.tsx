'use client'

import { Suspense, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
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
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every(Boolean)) verifyCode(next.join(''))
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
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
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
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
          We emailed a 6-digit code to <span className="text-cyber-text font-medium">{email}</span>
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="w-11 h-14 rounded-xl border border-cyber-border bg-cyber-card text-center text-cyber-text text-xl font-bold focus:border-cyber-neon focus:outline-none disabled:opacity-50 transition"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        {loading && <p className="text-cyber-muted text-sm animate-pulse">Verifying…</p>}

        <button
          onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(null) }}
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
        Enter your email — we&apos;ll send a 6-digit code.
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
