import { NextResponse } from 'next/server'
import {
  ACQUISITION_COOKIE,
  REGISTRATION_SOURCE_COOKIE,
  REGISTRATION_SOURCE_COOKIE_MAX_AGE,
  buildAcquisitionFromSearchParams,
  getAcquisitionFromRequest,
  getRegistrationSourceFromRequest,
  normalizeRegistrationSource,
  serializeAcquisitionCookie,
} from '@helpers/registrationSource.mjs'

export const dynamic = 'force-dynamic'

export const GET = async (request, { params }) => {
  const { tag } = await params
  const source = normalizeRegistrationSource(tag)
  const existingSource = getRegistrationSourceFromRequest(request)
  const requestUrl = new URL(request.url)
  const redirectUrl = new URL('/', request.url)
  const allowedParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'yclid',
  ]
  allowedParams.forEach((key) => {
    const value = requestUrl.searchParams.get(key)
    if (value) redirectUrl.searchParams.set(key, value)
  })
  const response = NextResponse.redirect(redirectUrl)

  if (!source) return response

  if (!existingSource) {
    response.cookies.set(REGISTRATION_SOURCE_COOKIE, source, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REGISTRATION_SOURCE_COOKIE_MAX_AGE,
      path: '/',
    })
  }

  if (!getAcquisitionFromRequest(request)) {
    const acquisition = buildAcquisitionFromSearchParams({
      searchParams: requestUrl.searchParams,
      source,
      landingPath: '/',
    })
    const cookieValue = serializeAcquisitionCookie(acquisition)
    if (cookieValue) {
      response.cookies.set(ACQUISITION_COOKIE, cookieValue, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: REGISTRATION_SOURCE_COOKIE_MAX_AGE,
        path: '/',
      })
    }
  }

  return response
}
