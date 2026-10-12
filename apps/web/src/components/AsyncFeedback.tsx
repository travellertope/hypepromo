'use client'

import { useEffect, useState } from 'react'

const SLOW_AFTER_MS = 4000

/**
 * Stays silent while a pending operation is quick, then fades in a calm hint
 * once it outlives `delayMs`. Resets whenever `active` goes false, so a fast
 * retry after a slow attempt starts quiet again.
 */
export function SlowHint({
  active,
  delayMs = SLOW_AFTER_MS,
  label = 'Connecting to server…',
  className = '',
}: {
  active: boolean
  delayMs?: number
  label?: string
  className?: string
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!active) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(t)
  }, [active, delayMs])

  if (!active || !show) return null
  return (
    <p className={`text-cyber-muted text-xs text-center animate-pulse ${className}`}>
      {label}
    </p>
  )
}

/** Inline error line. Replaces alert() so failures don't block the page. */
export function ErrorNote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  if (!children) return null
  return <p className={`text-red-500 text-xs text-center ${className}`}>{children}</p>
}

/** Full-page spinner shown while initial data loads. */
export function PageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-cyber-neon border-t-transparent animate-spin" />
      <SlowHint active delayMs={3000} />
    </div>
  )
}

/** Full-page error state with a retry button. */
export function PageError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <p className="text-cyber-text font-semibold">Couldn&apos;t load data</p>
      {message && <p className="text-cyber-muted text-sm max-w-xs">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl bg-cyber-accent text-white text-sm font-bold"
        >
          Retry
        </button>
      )}
    </div>
  )
}
