const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  customWorkerDir: 'worker',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: '/img/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '</fonts/FuturaPT-Heavy.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous'
          },
        ],
      },
    ]
  },
  productionBrowserSourceMaps:
    process.env.NEXT_PUBLIC_ENABLE_SOURCE_MAPS === 'true',
  turbopack: {},
}

module.exports = withPWA(nextConfig)
