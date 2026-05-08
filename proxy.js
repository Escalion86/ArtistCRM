import { NextResponse } from 'next/server'

const PRODUCTION_HOST = 'artistcrm.ru'
const LEGACY_HOSTS = new Set(['www.artistcrm.ru'])
const PARTYCRM_HOST = process.env.PARTYCRM_DOMAIN || 'partycrm.ru'

const normalizeHost = (host) =>
  String(host || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\/$/, '')

export function proxy(request) {
  const host = normalizeHost(request.headers.get('host'))
  const forwardedProto = request.headers.get('x-forwarded-proto') || ''
  const url = request.nextUrl
  const partyHost = normalizeHost(PARTYCRM_HOST)

  if (partyHost && host === partyHost && url.pathname === '/') {
    const rewriteUrl = url.clone()
    rewriteUrl.pathname = '/party'
    return NextResponse.rewrite(rewriteUrl)
  }

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
