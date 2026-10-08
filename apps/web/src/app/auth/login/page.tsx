'use client'

import { Suspense, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useAuthFlow } from '@/lib/useAuthFlow'

function Toast({ title, message, type, visible }: { title: string; message: string; type: 'success' | 'error' | 'info'; visible: boolean }) {
  const icons = {
    success: '✓',
    error: '!',
    info: 'i',
  }
  const colors = {
    success: 'bg-emerald-500/20 text-emerald-500',
    error: 'bg-rose-500/20 text-rose-500',
    info: 'bg-cyber-neon/20 text-cyber-neon',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-cyber-card border border-cyber-border shadow-2xl transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${colors[type]}`}>{icons[type]}</div>
      <div>
        <p className="text-xs font-bold text-cyber-text">{title}</p>
        <p className="text-xs text-cyber-muted">{message}</p>
      </div>
    </div>
  )
}

function LoginForm() {
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ title: '', message: '', type: 'success', visible: false })
  const otpRef = useRef<HTMLInputElement | null>(null)
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'creator'
  const isAdvertiser = role === 'advertiser'
  const { theme, toggle } = useTheme()

  const {
    step, email, setEmail, otp, setOtp,
    loading, error, countdown,
    sendCode, resendCode, verifyCode, signInWithGoogle, backToEmail,
  } = useAuthFlow(role, () => showToast('Verified!', 'Redirecting to your dashboard…'))

  function showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ title, message, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const sent = await sendCode()
    if (!sent) {
      showToast('Failed to send', 'Check the address and try again.', 'error')
      return
    }
    showToast('Code dispatched', `Verification code sent to ${email}`)
    setTimeout(() => otpRef.current?.focus(), 100)
  }

  async function handleResend() {
    const sent = await resendCode()
    showToast(
      sent ? 'Code resent' : 'Failed to resend',
      sent ? 'A fresh code has been sent.' : 'Please try again in a moment.',
      sent ? 'success' : 'error',
    )
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const ok = await verifyCode()
    if (!ok) {
      showToast('Invalid code', 'Check the code and try again.', 'error')
      otpRef.current?.focus()
    }
  }

  const handleGoogleOAuth = signInWithGoogle

  return (
    <>
      {/* Background glow */}
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(121,40,202,0.12)_0%,rgba(255,0,127,0.05)_50%,transparent_70%)] pointer-events-none animate-pulse" />
      <div className="fixed top-1/2 -right-32 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,transparent_70%)] pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="min-h-screen flex flex-col relative z-10">
        {/* Header */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-accent to-purple-600 flex items-center justify-center shadow-lg shadow-cyber-accent/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight font-display bg-gradient-to-r from-cyber-text via-cyber-text to-cyber-muted bg-clip-text text-transparent">Promoet</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-cyber-muted hidden sm:inline">
              {isAdvertiser ? 'Are you a creator?' : 'Are you an advertiser?'}
            </span>
            <a
              href={`/auth/login?role=${isAdvertiser ? 'creator' : 'advertiser'}`}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-cyber-border bg-cyber-card/60 hover:bg-cyber-card text-cyber-text transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-cyber-neon" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              {isAdvertiser ? 'Creator? Switch' : 'Advertiser? Switch'}
            </a>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full border border-cyber-border bg-cyber-card/60 hover:bg-cyber-card flex items-center justify-center text-cyber-muted hover:text-cyber-text transition-all"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              )}
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">

            {/* Role badge */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyber-neon/10 text-teal-700 dark:text-cyber-neon border border-cyber-neon/30">
                <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-cyber-neon animate-ping" />
                {isAdvertiser ? 'Brand & Agency Portal' : 'Creator Portal'}
              </span>
            </div>

            {/* Gradient border card */}
            <div className="p-px rounded-3xl bg-gradient-to-br from-cyber-accent/40 via-purple-600/30 to-cyber-neon/40">
              <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">

                {/* Subtle dot grid */}
                <div className="absolute inset-0 bg-[radial-gradient(var(--cyber-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

                {step === 'email' ? (
                  <div className="relative z-10">
                    <div className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-cyber-text mb-2">
                        {isAdvertiser ? 'Advertiser sign in' : 'Creator sign in'}
                      </h1>
                      <p className="text-cyber-muted text-sm leading-relaxed">
                        Enter your email — we&apos;ll send a secure verification code.
                      </p>
                    </div>

                    <form onSubmit={handleSend} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-cyber-muted mb-2">Email Address</label>
                        <div className="relative group">
                          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyber-muted group-focus-within:text-cyber-accent transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                          </span>
                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            autoFocus
                            className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-cyber-border rounded-2xl text-cyber-text [color-scheme:light_dark] placeholder-cyber-muted text-sm focus:outline-none focus:border-cyber-accent focus:ring-4 focus:ring-cyber-accent/15 transition-all"
                            style={{ color: 'var(--cyber-text)' }}
                          />
                        </div>
                      </div>

                      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyber-accent/30 hover:shadow-cyber-accent/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                      >
                        <span>{loading ? 'Sending…' : 'Send secure code'}</span>
                        {!loading && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>}
                      </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-cyber-border">
                      <p className="text-center text-xs text-cyber-muted mb-4 font-medium">Or continue instantly with</p>
                      <button
                        onClick={handleGoogleOAuth}
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-cyber-border bg-cyber-card/50 hover:bg-cyber-card text-sm font-semibold text-cyber-text transition-all"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="mb-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-cyber-accent/10 border border-cyber-accent/20 flex items-center justify-center mx-auto mb-4 text-cyber-accent text-xl shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight font-display text-cyber-text mb-2">Check your inbox</h2>
                      <p className="text-cyber-muted text-sm">
                        We&apos;ve sent a code to <span className="text-cyber-text font-semibold">{email}</span>
                      </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-cyber-muted mb-2">Verification Code</label>
                        <input
                          ref={otpRef}
                          type="tel"
                          inputMode="numeric"
                          placeholder="Enter code"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                          disabled={loading}
                          autoComplete="one-time-code"
                          className="w-full px-4 py-3.5 bg-white/10 border border-cyber-border rounded-2xl text-cyber-text text-center text-2xl font-bold tracking-widest placeholder-cyber-muted focus:outline-none focus:border-cyber-accent focus:ring-4 focus:ring-cyber-accent/15 transition-all disabled:opacity-50"
                          style={{ color: 'var(--cyber-text)' }}
                        />
                      </div>

                      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                      <button
                        type="submit"
                        disabled={loading || otp.length < 4}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyber-accent/30 hover:shadow-cyber-accent/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:scale-100"
                      >
                        {loading ? 'Verifying…' : 'Verify & Sign In'}
                      </button>

                      <div className="flex items-center justify-between text-xs text-cyber-muted pt-1">
                        <button
                          type="button"
                          onClick={backToEmail}
                          className="hover:text-cyber-text transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
                          Change email
                        </button>
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={countdown > 0 || loading}
                          className="text-cyber-neon hover:underline font-semibold disabled:opacity-50 disabled:no-underline"
                        >
                          Resend code {countdown > 0 ? `(${countdown}s)` : ''}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-cyber-muted">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-cyber-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                End-to-end encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-cyber-neon" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Instant access
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-cyber-border text-xs text-cyber-muted">
          <p>&copy; 2026 Promoet Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-cyber-text transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-cyber-text transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-cyber-text transition-colors">Support</a>
          </div>
        </footer>
      </div>

      <Toast {...toast} />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
