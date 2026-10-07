import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf4ff',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          900: '#701a75',
        },
        cyber: {
          dark: 'var(--cyber-dark)',
          card: 'var(--cyber-card)',
          border: 'var(--cyber-border)',
          neon: 'var(--cyber-neon)',
          accent: 'var(--cyber-accent)',
          text: 'var(--cyber-text)',
          muted: 'var(--cyber-muted)',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 16px 2px color-mix(in srgb, var(--cyber-neon) 33%, transparent)',
        'neon-pink': '0 0 16px 2px color-mix(in srgb, var(--cyber-accent) 33%, transparent)',
      },
    },
  },
  plugins: [],
}

export default config
