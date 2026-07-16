import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import { findUserByPhone, normalizePhone } from '@server/phoneVerification'
import { checkRateLimit, rateLimitResponse } from '@server/rateLimit'
import { createMobileSession } from '@server/mobile/sessions'
import {
  getMobileDevice,
  mobileError,
  mobileSuccess,
} from '@server/mobile/routeHelpers'

const isHash = (value) => typeof value === 'string' && value.startsWith('$2')

export const POST = async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const phone = normalizePhone(body?.phone)
    const password = String(body?.password || '')
    if (!phone || !password) {
      return mobileError('CREDENTIALS_REQUIRED', 'Укажите телефон и пароль', 400)
    }

    const limit = await checkRateLimit({
      req,
      scope: 'mobile_v1_auth_login',
      limit: 10,
      windowMs: 10 * 60 * 1000,
      keyParts: [phone],
    })
    if (!limit.ok) return rateLimitResponse(NextResponse, limit)

    await dbConnect()
    const user = await findUserByPhone(phone)
    const storedPassword = user?.password || ''
    const passwordMatches = user
      ? isHash(storedPassword)
        ? await bcrypt.compare(password, storedPassword)
        : storedPassword === password
      : false
    if (!user || user.archive || !passwordMatches) {
      return mobileError(
        'INVALID_CREDENTIALS',
        'Неверный телефон или пароль',
        401
      )
    }

    if (!isHash(storedPassword)) {
      user.password = await bcrypt.hash(password, 10)
      if (!user.tenantId) user.tenantId = user._id
      await user.save()
    }

    const session = await createMobileSession({
      user,
      device: getMobileDevice(req, body),
    })
    return mobileSuccess(session)
  } catch (error) {
    console.error('[mobile/v1/auth/login]', error)
    return mobileError('LOGIN_FAILED', 'Не удалось выполнить вход', 500)
  }
}
