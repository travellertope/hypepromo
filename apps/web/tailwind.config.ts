import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
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
          dark: '#0a0314',
          card: '#140728',
          border: '#3b186b',
          neon: '#00f0ff',
          accent: '#ff007f',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 16px 2px #00f0ff55',
        'neon-pink': '0 0 16px 2px #ff007f55',
      },
    },
  },
  plugins: [],
}

export default config
