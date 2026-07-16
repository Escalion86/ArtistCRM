import { NextResponse } from 'next/server'
import AccountDeletionRequests from '@models/AccountDeletionRequests'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import { normalizePhone } from '@server/phoneVerification'
import { checkRateLimit, rateLimitResponse } from '@server/rateLimit'

const acceptedResponse = () =>
  NextResponse.json(
    {
      success: true,
      message:
        'Если аккаунт найден, запрос на удаление принят. Подтверждение будет отправлено по контактам аккаунта.',
    },
    { status: 202 }
  )

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const phone = normalizePhone(body?.phone)
  const email = String(body?.email || '').trim().toLowerCase()
  if (!phone && !email) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONTACT_REQUIRED',
          type: 'validation',
          message: 'Укажите телефон или email аккаунта',
        },
      },
      { status: 400 }
    )
  }

  const limit = await checkRateLimit({
    req,
    scope: 'public_account_deletion',
    limit: 5,
    windowMs: 60 * 60 * 1000,
    keyParts: [phone || email],
  })
  if (!limit.ok) return rateLimitResponse(NextResponse, limit)

  await dbConnect()
  const user = await Users.findOne({
    ...(phone && email
      ? { $or: [{ phone }, { email }] }
      : phone
        ? { phone }
        : { email }),
    archive: { $ne: true },
  })
    .select('_id tenantId')
    .lean()

  // Одинаковый ответ скрывает факт существования аккаунта.
  if (!user?._id) return acceptedResponse()

  await AccountDeletionRequests.findOneAndUpdate(
    { userId: user._id, status: { $in: ['pending', 'processing'] } },
    {
      $setOnInsert: {
        userId: user._id,
        tenantId: user.tenantId || user._id,
        source: 'public_web',
        requestedAt: new Date(),
      },
      $set: { status: 'pending' },
    },
    { upsert: true }
  )
  return acceptedResponse()
}
