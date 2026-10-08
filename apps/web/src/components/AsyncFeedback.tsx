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
