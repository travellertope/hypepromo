import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav, advertiserItems } from '@/components/BottomNav'

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-cyber-border bg-cyber-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/advertiser" aria-label="Promoet home">
            <Logo className="h-8 w-auto" variant="wordmark" />
          </Link>
          {/* Desktop nav — hidden on mobile where BottomNav takes over */}
          <nav className="hidden md:flex gap-1 items-center">
            {[
              { href: '/advertiser', label: 'Campaigns' },
              { href: '/advertiser/stats', label: 'Stats' },
              { href: '/advertiser/topup', label: 'Top Up' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm text-cyber-muted hover:text-cyber-text hover:bg-black/5 transition-all"
              >
                {item.label}
              </Link>
            ))}
            <ThemeToggle className="ml-2" />
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
      <BottomNav items={advertiserItems} />
    </div>
  )
}
