import type { ReactNode } from 'react'
import { BottomNav } from '@/components/BottomNav'

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
