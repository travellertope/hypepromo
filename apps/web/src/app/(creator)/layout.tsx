import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { BottomNav } from '@/components/BottomNav'
import { UserMenu } from '@/components/UserMenu'

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {/* Compact branding bar */}
      <header className="sticky top-0 z-10 bg-cyber-card border-b border-cyber-border">
        <div className="h-12 grid grid-cols-[2.25rem_1fr_2.25rem] items-center px-4">
          {/* left spacer keeps logo centred */}
          <div />
          <Link href="/creator" aria-label="Promoet home" className="flex justify-center">
            <Logo className="h-4 w-auto" />
          </Link>
          <UserMenu links={[{ href: '/creator/profile', label: 'Profile' }]} />
        </div>
      </header>
      {children}
      <BottomNav />
    </div>
  )
}
