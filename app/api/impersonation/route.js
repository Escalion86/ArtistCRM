import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import authOptions from '../auth/[...nextauth]/_options'
import dbConnect from '@server/dbConnect'
import getAuthSecret from '@server/getAuthSecret'
import { createImpersonationTicket } from '@server/impersonationTicket'
import Users from '@models/Users'

export const dynamic = 'force-dynamic'

const errorResponse = (status, code, message) =>
  Response.json(
    { success: false, error: { code, type: 'impersonation', message } },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )

export const POST = async (req) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?._id) {
    return errorResponse(401, 'UNAUTHORIZED', 'Необходимо авторизоваться')
  }

  let body = null
  try {
    body = await req.json()
  } catch (error) {
    return errorResponse(400, 'INVALID_JSON', 'Некорректный формат запроса')
  }

  await dbConnect()

  if (body?.action === 'restore') {
    const originalUserId = session.user?.impersonation?.originalUserId
    if (!originalUserId || !mongoose.Types.ObjectId.isValid(originalUserId)) {
      return errorResponse(
        403,
        'NOT_IMPERSONATING',
        'Режим пользователя не активен'
      )
    }

    const originalUser = await Users.findById(originalUserId)
      .select('_id role')
      .lean()
    if (!originalUser || originalUser.role !== 'dev') {
      return errorResponse(403, 'DEVELOPER_NOT_FOUND', 'Нет доступа')
    }

    const ticket = createImpersonationTicket(
      {
        action: 'restore',
        originalUserId,
        targetUserId: originalUserId,
      },
      getAuthSecret()
    )
    return Response.json(
      { success: true, ticket },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (session.user.role !== 'dev' || session.user?.impersonation?.active) {
    return errorResponse(403, 'DEVELOPER_ONLY', 'Доступно только разработчику')
  }

  const currentDeveloper = await Users.findById(session.user._id)
    .select('_id role')
    .lean()
  if (!currentDeveloper || currentDeveloper.role !== 'dev') {
    return errorResponse(403, 'DEVELOPER_ONLY', 'Доступно только разработчику')
  }

  const targetUserId = String(body?.targetUserId || '')
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return errorResponse(400, 'INVALID_USER_ID', 'Некорректный пользователь')
  }
  if (targetUserId === String(session.user._id)) {
    return errorResponse(400, 'SAME_USER', 'Это уже ваша учётная запись')
  }

  const targetUser = await Users.findById(targetUserId).select('_id').lean()
  if (!targetUser) {
    return errorResponse(404, 'USER_NOT_FOUND', 'Пользователь не найден')
  }

  const ticket = createImpersonationTicket(
    {
      action: 'start',
      originalUserId: currentDeveloper._id,
      targetUserId,
    },
    getAuthSecret()
  )
  return Response.json(
    { success: true, ticket },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
