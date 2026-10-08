'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type AuthRole = 'creator' | 'advertiser' | 'admin'

const RESEND_SECONDS = 45

export function dashboardFor(role: string): string {
  if (role === 'advertiser') return '/advertiser'
  if (role === 'admin') return '/admin'
  return '/creator'
}

/**
 * The real Supabase auth flow — email OTP plus Google OAuth — shared by the
 * /auth/login page and the homepage modal so the two can never drift apart.
 */
export function useAuthFlow(role: string, onVerified?: () => void) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const startCountdown = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    setCountdown(RESEND_SECONDS)
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [])

  const sendCode = useCallback(async () => {
    setError(null)
    setNotice(null)
    setLoading(true)
    const { error: e } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { data: { role } },
    })
    setLoading(false)
    if (e) {
      setError(e.message)
      return false
    }
    setStep('otp')
    startCountdown()
    setNotice(`Verification code sent to ${email.trim()}`)
    return true
  }, [email, role, startCountdown])

  const resendCode = useCallback(async () => {
    if (countdown > 0) return
    setError(null)
    setLoading(true)
    const { error: e } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { data: { role } },
    })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    startCountdown()
    setNotice('A fresh code has been sent.')
  }, [countdown, email, role, startCountdown])

  const verifyCode = useCallback(async () => {
    if (otp.trim().length < 4) return
    setError(null)
    setLoading(true)
    const { error: e } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })
    if (e) {
      setError('Invalid or expired code. Try again.')
      setOtp('')
      setLoading(false)
      return
    }
    onVerified?.()
    router.replace(dashboardFor(role))
    router.refresh()
  }, [email, otp, role, router, onVerified])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const base = process.env['NEXT_PUBLIC_APP_URL'] ?? window.location.origin
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/auth/callback?role=${role}` },
    })
    if (e) setError(e.message)
  }, [role])

  const backToEmail = useCallback(() => {
    setStep('email')
    setOtp('')
    setError(null)
    setNotice(null)
  }, [])

  return {
    step, email, setEmail, otp, setOtp,
    loading, error, notice, countdown,
    sendCode, resendCode, verifyCode, signInWithGoogle, backToEmail,
  }
}
