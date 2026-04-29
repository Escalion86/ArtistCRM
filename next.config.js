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
    unoptimized: true,
  },
  productionBrowserSourceMaps:
    process.env.NEXT_PUBLIC_ENABLE_SOURCE_MAPS === 'true',
  turbopack: {},
}

module.exports = withPWA(nextConfig)
