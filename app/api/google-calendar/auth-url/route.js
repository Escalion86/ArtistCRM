import { NextResponse } from 'next/server'
import crypto from 'crypto'

import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import { getOAuthClient, WRITE_SCOPE } from '@server/googleUserCalendarClient'

export const runtime = 'nodejs'

const encodeState = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url')

export const GET = async (req) => {
  const { user } = await getTenantContext()
  if (!user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  const access = await getUserTariffAccess(user._id)
  if (!access?.allowCalendarSync) {
    return NextResponse.json(
      { success: false, error: 'Синхронизация недоступна по тарифу' },
      { status: 403 }
    )
  }

  const oauth = getOAuthClient()
  if (!oauth) {
    return NextResponse.json(
      { success: false, error: 'Google OAuth не настроен' },
      { status: 500 }
    )
  }

  await dbConnect()
  const dbUser = await Users.findById(user._id).select('_id').lean()
  if (!dbUser?._id) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  const redirect = req.nextUrl.searchParams.get('redirect') || '/cabinet/profile'
  const nonce = crypto.randomBytes(16).toString('hex')
  const state = encodeState({ nonce, redirect })

  const url = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [WRITE_SCOPE],
    state,
  })

  const response = NextResponse.json({ success: true, data: { url } })
  response.cookies.set('gc_oauth_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  })
  return response
}
