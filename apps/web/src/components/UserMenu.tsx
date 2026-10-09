'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface MenuLink {
  href: string
  label: string
}

export function UserMenu({ links }: { links?: MenuLink[] }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : '?'

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-cyber-accent/20 border border-cyber-accent/40 flex items-center justify-center text-xs font-bold text-cyber-accent hover:bg-cyber-accent/30 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-56 rounded-2xl bg-cyber-card border border-cyber-border shadow-2xl z-50 overflow-hidden">
          {email && (
            <div className="px-4 py-3 border-b border-cyber-border">
              <p className="text-xs font-medium text-cyber-text truncate">{email}</p>
            </div>
          )}
          {links && links.length > 0 && (
            <div className="p-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-cyber-text hover:bg-cyber-text/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <div className={`p-1${links && links.length > 0 ? ' border-t border-cyber-border' : ''}`}>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3-3m3 3H2.25" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
