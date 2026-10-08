import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { BottomNav } from '@/components/BottomNav'

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {/* Compact branding bar — keeps the Logo visible without competing with page content */}
      <header className="sticky top-0 z-10 bg-cyber-card border-b border-cyber-border">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center">
          <Link href="/creator" aria-label="Promoet home">
            <Logo className="h-7 w-auto" showTagline={false} />
          </Link>
        </div>
      </header>
      {children}
      <BottomNav />
    </div>
  )
}
