'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuthFlow } from '@/lib/useAuthFlow'

type Role = 'creator' | 'advertiser'
type Open = (role: Role) => void

const AuthModalContext = createContext<Open>(() => {})

/** Opens the sign-in modal. Falls back to a no-op outside the provider. */
export function useAuthModal() {
  return useContext(AuthModalContext)
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null)
  const open = useCallback((r: Role) => setRole(r), [])
  return (
    <AuthModalContext.Provider value={open}>
      {children}
      {role && <AuthDialog role={role} onClose={() => setRole(null)} />}
    </AuthModalContext.Provider>
  )
}

function AuthDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const auth = useAuthFlow(role)

  // showModal() (rather than the open attribute) gives focus trapping,
  // inertness of the page behind, and Escape-to-close for free.
  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])

  const isAdvertiser = role === 'advertiser'

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close() }}
      aria-labelledby="auth-modal-title"
      className="backdrop:bg-black/70 backdrop:backdrop-blur-sm bg-transparent p-4 max-w-full max-h-full w-full sm:w-auto"
    >
      <div className="w-full sm:w-[26rem] mx-auto p-px rounded-3xl bg-gradient-to-br from-cyber-accent/40 via-purple-600/30 to-cyber-neon/40">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(var(--cyber-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

          <button
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg flex items-center justify-center text-cyber-muted hover:text-cyber-text hover:bg-cyber-card transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="relative z-10">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyber-neon/10 text-teal-700 dark:text-cyber-neon border border-cyber-neon/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-cyber-neon" />
                {isAdvertiser ? 'Brand & Agency Portal' : 'Creator Portal'}
              </span>
            </div>

            {auth.step === 'email' ? (
              <>
                <h2 id="auth-modal-title" className="text-xl font-black font-display text-cyber-text mb-1">
                  {isAdvertiser ? 'Advertiser sign in' : 'Creator sign in'}
                </h2>
                <p className="text-cyber-muted text-sm mb-5">
                  Enter your email — we&apos;ll send a secure verification code. No password needed.
                </p>

                <form
                  onSubmit={(e) => { e.preventDefault(); void auth.sendCode() }}
                  className="space-y-4"
                >
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={auth.email}
                    onChange={(e) => auth.setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-cyber-card border border-cyber-border rounded-2xl text-cyber-text placeholder-cyber-muted text-sm focus:outline-none focus:border-cyber-accent focus:ring-4 focus:ring-cyber-accent/15 transition"
                    style={{ color: 'var(--cyber-text)' }}
                  />

                  {auth.error && <p className="text-red-500 text-xs text-center">{auth.error}</p>}

                  <button
                    type="submit"
                    disabled={auth.loading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 transition"
                  >
                    {auth.loading ? 'Sending…' : 'Send secure code'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-cyber-border">
                  <p className="text-center text-xs text-cyber-muted mb-3">Or continue instantly with</p>
                  <button
                    onClick={() => void auth.signInWithGoogle()}
                    className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-cyber-border bg-cyber-card/50 hover:bg-cyber-card text-sm font-semibold text-cyber-text transition"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                </div>

                <p className="text-center text-[11px] text-cyber-muted mt-5">
                  {isAdvertiser ? 'Creator instead? ' : 'Advertiser instead? '}
                  <a href={`/auth/login?role=${isAdvertiser ? 'creator' : 'advertiser'}`} className="text-cyber-neon font-semibold hover:underline">
                    Switch
                  </a>
                </p>
              </>
            ) : (
              <>
                <h2 id="auth-modal-title" className="text-xl font-black font-display text-cyber-text mb-1 text-center">
                  Check your inbox
                </h2>
                <p className="text-cyber-muted text-sm mb-5 text-center">
                  We&apos;ve sent a code to <span className="text-cyber-text font-semibold">{auth.email}</span>
                </p>

                <form
                  onSubmit={(e) => { e.preventDefault(); void auth.verifyCode() }}
                  className="space-y-4"
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    autoComplete="one-time-code"
                    placeholder="Enter code"
                    value={auth.otp}
                    onChange={(e) => auth.setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3.5 bg-cyber-card border border-cyber-border rounded-2xl text-cyber-text placeholder-cyber-muted text-center text-lg font-bold tracking-[0.3em] focus:outline-none focus:border-cyber-accent focus:ring-4 focus:ring-cyber-accent/15 transition"
                    style={{ color: 'var(--cyber-text)' }}
                  />

                  {auth.error && <p className="text-red-500 text-xs text-center">{auth.error}</p>}

                  <button
                    type="submit"
                    disabled={auth.loading || auth.otp.length < 4}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 transition"
                  >
                    {auth.loading ? 'Verifying…' : 'Verify & continue'}
                  </button>
                </form>

                <div className="flex items-center justify-between mt-5 text-xs">
                  <button onClick={auth.backToEmail} className="text-cyber-muted hover:text-cyber-text transition">
                    ← Change email
                  </button>
                  <button
                    onClick={() => void auth.resendCode()}
                    disabled={auth.countdown > 0 || auth.loading}
                    className="text-cyber-neon font-semibold disabled:text-cyber-muted disabled:cursor-not-allowed transition"
                  >
                    {auth.countdown > 0 ? `Resend in ${auth.countdown}s` : 'Resend code'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
