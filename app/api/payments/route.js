import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import Users from '@models/Users'
import Payments from '@models/Payments'
import SiteSettings from '@models/SiteSettings'
import { createReferralRewardForBalanceTopup } from '@server/referralRewards'
import mongoose from 'mongoose'

const sanitizeUser = (user) => {
  if (!user) return null
  const data = typeof user.toObject === 'function' ? user.toObject() : user
  const { password, ...rest } = data
  return rest
}

const logReferralRewardError = (paymentId, error) => {
  console.error('[referralRewards] failed to create reward', {
    paymentId: paymentId ? String(paymentId) : null,
    error: {
      name: error?.name,
      message: error?.message,
    },
  })
}

export const GET = async (req) => {
  const { user, tenantId } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Не указан пользователь' },
      { status: 400 }
    )
  }

  const isAdmin = ['dev', 'admin'].includes(user?.role)
  const isSelf = String(user?._id) === String(userId)
  if (!isAdmin && !isSelf) {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }

  await dbConnect()

  const query = isAdmin ? { userId } : { userId, tenantId }
  const payments = await Payments.find(query).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ success: true, data: payments }, { status: 200 })
}

export const POST = async (req) => {
  const body = await req.json().catch(() => ({}))
  const { user, tenantId } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  if (!['dev', 'admin'].includes(user?.role)) {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }

  const amount = Number(body.amount ?? 0)
  if (!body.userId) {
    return NextResponse.json(
      { success: false, error: 'Не указан пользователь' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { success: false, error: 'Некорректная сумма' },
      { status: 400 }
    )
  }

  await dbConnect()

  const userToUpdate = await Users.findById(body.userId)
  if (!userToUpdate) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  const balance = Number(userToUpdate.balance ?? 0)
  userToUpdate.balance = balance + amount
  await userToUpdate.save()

  const payment = await Payments.create({
    userId: userToUpdate._id,
    tenantId: userToUpdate.tenantId ?? tenantId ?? userToUpdate._id,
    tariffId: userToUpdate.tariffId ?? null,
    amount,
    type: 'topup',
    source: 'manual',
    purpose: 'balance',
    comment: body.comment ?? '',
  })

  try {
    await createReferralRewardForBalanceTopup({
      payment,
      UsersModel: Users,
      PaymentsModel: Payments,
      SiteSettingsModel: SiteSettings,
      allowManualReward: body.rewardReferrer === true,
    })
  } catch (error) {
    logReferralRewardError(payment?._id, error)
  }

  return NextResponse.json(
    { success: true, data: { user: sanitizeUser(userToUpdate), payment } },
    { status: 201 }
  )
}

export const DELETE = async (req) => {
  const body = await req.json().catch(() => ({}))
  const { user } = await getTenantContext()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  if (!['dev', 'admin'].includes(user?.role)) {
    return NextResponse.json(
      { success: false, error: 'Нет доступа' },
      { status: 403 }
    )
  }
  if (!body.paymentId) {
    return NextResponse.json(
      { success: false, error: 'Не указано пополнение' },
      { status: 400 }
    )
  }

  await dbConnect()
  const session = await mongoose.startSession()
  let updatedUsers = []

  try {
    await session.withTransaction(async () => {
      updatedUsers = []
      const payment = await Payments.findById(body.paymentId).session(session)
      if (!payment) {
        const error = new Error('Пополнение не найдено')
        error.status = 404
        throw error
      }

      const isManualTopup =
        payment.type === 'topup' &&
        payment.source === 'manual' &&
        payment.purpose === 'balance' &&
        payment.status === 'succeeded'
      const isReferralReward =
        payment.type === 'topup' &&
        payment.source === 'system' &&
        payment.referralReward?.rewardFor === 'balance_topup'

      if (!isManualTopup && !isReferralReward) {
        const error = new Error(
          'Можно удалять только ручные пополнения и реферальные бонусы'
        )
        error.status = 400
        throw error
      }

      const linkedReward = isManualTopup
        ? await Payments.findOne({
            'referralReward.sourcePaymentId': payment._id,
            'referralReward.rewardFor': 'balance_topup',
          }).session(session)
        : null
      const paymentsToDelete = [payment, linkedReward].filter(Boolean)
      const deductions = new Map()

      paymentsToDelete.forEach((item) => {
        const userId = String(item.userId)
        deductions.set(
          userId,
          Number(deductions.get(userId) ?? 0) + Number(item.amount ?? 0)
        )
      })

      for (const [userId, amount] of deductions) {
        const balanceUser = await Users.findById(userId).session(session)
        if (!balanceUser) {
          const error = new Error('Пользователь пополнения не найден')
          error.status = 404
          throw error
        }
        if (Number(balanceUser.balance ?? 0) < amount) {
          const error = new Error(
            `Недостаточно средств для отката у пользователя ${
              [balanceUser.firstName, balanceUser.secondName]
                .filter(Boolean)
                .join(' ') || userId
            }`
          )
          error.status = 409
          throw error
        }
        balanceUser.balance = Number(balanceUser.balance ?? 0) - amount
        await balanceUser.save({ session })
        updatedUsers.push(sanitizeUser(balanceUser))
      }

      await Payments.deleteMany({
        _id: { $in: paymentsToDelete.map((item) => item._id) },
      }).session(session)
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Не удалось удалить пополнение',
      },
      { status: error?.status || 500 }
    )
  } finally {
    await session.endSession()
  }

  return NextResponse.json(
    { success: true, data: { users: updatedUsers } },
    { status: 200 }
  )
}
