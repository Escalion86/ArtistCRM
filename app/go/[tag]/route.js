import { NextResponse } from 'next/server'
import {
  REGISTRATION_SOURCE_COOKIE,
  REGISTRATION_SOURCE_COOKIE_MAX_AGE,
  getRegistrationSourceFromRequest,
  normalizeRegistrationSource,
} from '@helpers/registrationSource.mjs'

export const dynamic = 'force-dynamic'

export const GET = async (request, { params }) => {
  const { tag } = await params
  const source = normalizeRegistrationSource(tag)
  const existingSource = getRegistrationSourceFromRequest(request)
  const response = NextResponse.redirect(new URL('/', request.url))

  if (!source || existingSource) return response

  response.cookies.set(REGISTRATION_SOURCE_COOKIE, source, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REGISTRATION_SOURCE_COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}
