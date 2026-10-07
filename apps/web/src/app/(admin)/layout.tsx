import type { ReactNode } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV = [
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/proofs', label: 'Proofs' },
  { href: '/admin/fraud', label: 'Fraud' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 border-r border-cyber-border bg-cyber-card/80 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-bold text-cyber-accent uppercase tracking-widest">Admin</p>
            <ThemeToggle />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-sm text-cyber-muted hover:text-cyber-text hover:bg-black/5 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6 min-w-0">{children}</main>
    </div>
  )
}
