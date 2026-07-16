import getRequestContext from '@server/getRequestContext'
import MobileSessions from '@models/MobileSessions'
import mongoose from 'mongoose'
import { deactivateExpoPushTokenByDevice } from '@server/expoPushNotifications'
import { serializeMobileDeviceSession } from '@server/mobile/deviceSessions'
import {
  listMobileSessions,
  revokeMobileSession,
} from '@server/mobile/sessions'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id)
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  const sessions = await listMobileSessions(context.user._id)
  return mobileSuccess(
    sessions.map((session) =>
      serializeMobileDeviceSession(session, context.mobileSessionId)
    )
  )
}

export const DELETE = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id)
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  const body = await req.json().catch(() => ({}))
  const sessionId = String(body?.sessionId || '')
  if (!sessionId)
    return mobileError('SESSION_ID_REQUIRED', 'Сессия не указана', 400)
  if (!mongoose.isValidObjectId(sessionId)) {
    return mobileError(
      'SESSION_ID_INVALID',
      'Некорректный идентификатор сессии',
      400
    )
  }
  if (sessionId === String(context.mobileSessionId || '')) {
    return mobileError(
      'SESSION_CURRENT_USE_LOGOUT',
      'Для текущего устройства используйте выход из аккаунта',
      400,
      'sessionId'
    )
  }
  const session = await MobileSessions.findOne({
    _id: sessionId,
    userId: context.user._id,
    revokedAt: null,
  })
    .select('tenantId deviceId')
    .lean()
  const revoked = await revokeMobileSession({
    sessionId,
    userId: context.user._id,
  })
  if (session?.tenantId && session?.deviceId) {
    await deactivateExpoPushTokenByDevice({
      tenantId: session.tenantId,
      deviceId: session.deviceId,
    })
  }
  return mobileSuccess({ revoked })
}
