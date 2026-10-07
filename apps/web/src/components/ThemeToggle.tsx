'use client'

import { useTheme } from './ThemeProvider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`w-9 h-9 flex items-center justify-center rounded-xl border border-cyber-border hover:border-cyber-neon transition text-lg ${className ?? ''}`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
