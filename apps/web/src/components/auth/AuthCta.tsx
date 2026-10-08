'use client'

import { useAuthModal } from './AuthModal'

/**
 * Opens the auth modal in place. Rendered as a link to the real auth route so
 * it still works without JS and stays crawlable; the click is intercepted
 * only when the modal is actually available.
 */
export function AuthCta({
  role,
  className,
  children,
}: {
  role: 'creator' | 'advertiser'
  className?: string
  children: React.ReactNode
}) {
  const open = useAuthModal()
  return (
    <a
      href={`/auth/login?role=${role}`}
      onClick={(e) => {
        // Let modified clicks (new tab, etc.) behave like a normal link.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        open(role)
      }}
      className={className}
    >
      {children}
    </a>
  )
}
