import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', // required for Docker deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // allow larger CSV/Excel uploads
    },
  },
}

export default nextConfig
