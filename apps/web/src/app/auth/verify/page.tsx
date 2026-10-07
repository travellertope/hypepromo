'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}

function VerifyForm() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'creator'

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_phone')
    if (!stored) { router.replace('/auth/login'); return }
    setPhone(stored)
    inputRefs.current[0]?.focus()
  }, [router])

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
    if (!phone) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    })

    if (verifyError) {
      setError('Invalid or expired code. Try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setLoading(false)
      return
    }

    sessionStorage.removeItem('otp_phone')
    // Redirect based on role — onboarding routes handle first-time setup
    router.replace(role === 'advertiser' ? '/advertiser' : '/creator')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm text-center">
        <h1 className="font-extrabold text-2xl text-cyber-neon mb-1">
          Enter your code
        </h1>
        <p className="text-purple-300 text-sm mb-6">
          Sent to {phone ?? '…'}
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
              className="w-11 h-14 rounded-xl border border-cyber-border bg-cyber-card text-center text-white text-xl font-bold focus:border-cyber-neon focus:outline-none disabled:opacity-50 transition"
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {loading && (
          <p className="text-purple-300 text-sm animate-pulse">Verifying…</p>
        )}

        <button
          onClick={() => router.replace(`/auth/login?role=${role}`)}
          className="mt-4 text-xs text-purple-400 underline"
        >
          Change number
        </button>
      </div>
    </main>
  )
}
