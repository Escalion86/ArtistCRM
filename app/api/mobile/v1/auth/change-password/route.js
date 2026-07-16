import bcrypt from 'bcryptjs'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  createMobileSession,
  revokeAllMobileSessions,
} from '@server/mobile/sessions'
import {
  getMobileDevice,
  mobileError,
  mobileSuccess,
} from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id) return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  const body = await req.json().catch(() => ({}))
  const currentPassword = String(body?.currentPassword || '')
  const newPassword = String(body?.newPassword || '')
  if (newPassword.length < 8) {
    return mobileError(
      'INVALID_PASSWORD',
      'Новый пароль должен быть не менее 8 символов',
      400,
      'newPassword'
    )
  }

  await dbConnect()
  const user = await Users.findOne({
    _id: context.user._id,
    tenantId: context.tenantId,
    archive: { $ne: true },
  })
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  const stored = String(user.password || '')
  const matches = stored.startsWith('$2')
    ? await bcrypt.compare(currentPassword, stored)
    : stored === currentPassword
  if (!matches) {
    return mobileError('CURRENT_PASSWORD_INVALID', 'Текущий пароль указан неверно', 400, 'currentPassword')
  }

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()
  await revokeAllMobileSessions(user._id)
  const session = await createMobileSession({
    user,
    device: getMobileDevice(req, body),
  })
  return mobileSuccess(session)
}
