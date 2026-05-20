const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  customWorkerDir: 'worker',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  productionBrowserSourceMaps: true,
  turbopack: {},
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '</fonts/FuturaPT-Heavy.ttf>; rel=preload; as=font; type=font/ttf; crossorigin=anonymous, </fonts/FuturaPT-Bold.ttf>; rel=preload; as=font; type=font/ttf; crossorigin=anonymous, </fonts/InterTight-Regular.ttf>; rel=preload; as=font; type=font/ttf; crossorigin=anonymous, </fonts/InterTight-SemiBold.ttf>; rel=preload; as=font; type=font/ttf; crossorigin=anonymous, </fonts/InterTight-Medium.ttf>; rel=preload; as=font; type=font/ttf; crossorigin=anonymous',
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
    ]
  },
}

module.exports = withPWA(nextConfig)
