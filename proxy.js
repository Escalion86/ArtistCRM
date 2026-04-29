import { NextResponse } from 'next/server'

const PRODUCTION_HOST = 'artistcrm.ru'
const LEGACY_HOSTS = new Set(['www.artistcrm.ru'])

export function proxy(request) {
  const host = request.headers.get('host')?.toLowerCase() || ''
  const forwardedProto = request.headers.get('x-forwarded-proto') || ''
  const url = request.nextUrl

  const isProductionHost = host === PRODUCTION_HOST || LEGACY_HOSTS.has(host)
  if (!isProductionHost) return NextResponse.next()

  const shouldUseApex = LEGACY_HOSTS.has(host)
  const shouldUseHttps = forwardedProto === 'http' || url.protocol === 'http:'

  if (!shouldUseApex && !shouldUseHttps) return NextResponse.next()

  const redirectUrl = url.clone()
  redirectUrl.hostname = PRODUCTION_HOST
  redirectUrl.protocol = 'https:'

  return NextResponse.redirect(redirectUrl, 308)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|worker-.*|icons|img).*)',
  ],
}
