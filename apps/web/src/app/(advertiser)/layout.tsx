import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-cyber-border bg-cyber-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/advertiser" className="font-black text-lg text-cyber-neon tracking-tight">
            Promoet <span className="text-white/40 text-sm font-normal">Advertiser</span>
          </Link>
          <nav className="flex gap-1">
            {[
              { href: '/advertiser', label: 'Campaigns' },
              { href: '/advertiser/stats', label: 'Stats' },
              { href: '/advertiser/topup', label: 'Top Up' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
