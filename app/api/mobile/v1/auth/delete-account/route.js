import AccountDeletionRequests from '@models/AccountDeletionRequests'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { revokeAllMobileSessions } from '@server/mobile/sessions'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id) return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  const body = await req.json().catch(() => ({}))
  if (String(body?.confirmation || '').trim().toUpperCase() !== 'УДАЛИТЬ') {
    return mobileError(
      'DELETE_CONFIRMATION_REQUIRED',
      'Для подтверждения введите «УДАЛИТЬ»',
      400,
      'confirmation'
    )
  }

  await dbConnect()
  const request = await AccountDeletionRequests.findOneAndUpdate(
    { userId: context.user._id, status: { $in: ['pending', 'processing'] } },
    {
      $setOnInsert: {
        userId: context.user._id,
        tenantId: context.tenantId,
        source: 'android',
        requestedAt: new Date(),
      },
      $set: { status: 'pending' },
    },
    { upsert: true, returnDocument: 'after' }
  )
  await revokeAllMobileSessions(context.user._id)
  return mobileSuccess({ requestId: String(request._id), status: request.status }, 202)
}
