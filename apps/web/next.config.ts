import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // API lives on Render; rewrite /api/* to it in development
  async rewrites() {
    if (process.env['NODE_ENV'] === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/:path*`,
        },
      ]
    }
    return []
  },
}

export default nextConfig
