import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'

// Origin of the Django API for server-side rewrites. Must stay an
// absolute backend URL even when NEXT_PUBLIC_API_URL is the same-origin
// proxy path (/backend-api) — otherwise rewrites loop onto themselves.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? 'http://localhost:8765'

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ]
  },
}

export default withPayload(nextConfig)
