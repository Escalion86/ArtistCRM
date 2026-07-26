import { NextResponse } from 'next/server'
import {
  ACQUISITION_COOKIE,
  REGISTRATION_SOURCE_COOKIE_MAX_AGE,
  getAcquisitionFromRequest,
  normalizeAcquisition,
  serializeAcquisitionCookie,
} from '@helpers/registrationSource.mjs'

export const POST = async (req) => {
  if (getAcquisitionFromRequest(req)) {
    return NextResponse.json({ success: true, captured: false })
  }

  const body = await req.json().catch(() => ({}))
  const acquisition = normalizeAcquisition(body)
  if (!acquisition) {
    return NextResponse.json(
      { success: false, error: 'Некорректные параметры атрибуции' },
      { status: 400 }
    )
  }

  const response = NextResponse.json({ success: true, captured: true })
  response.cookies.set(ACQUISITION_COOKIE, serializeAcquisitionCookie(acquisition), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REGISTRATION_SOURCE_COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
