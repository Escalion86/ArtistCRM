import crypto from 'crypto'
import Payments from '@models/Payments'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { getMobileBillingUserFilter } from '@server/mobile/billingStore'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import {
  createYookassaPayment,
  isYookassaConfigured,
  normalizeAmount,
} from '@server/yookassa'

const MIN_AMOUNT = 100
const MAX_AMOUNT = 300000

const getReturnUrl = (req) => {
  const url = new URL(req.url)
  const origin = process.env.DOMAIN?.startsWith('http')
    ? process.env.DOMAIN
    : `https://${process.env.DOMAIN || url.host}`
  return `${origin.replace(/\/$/, '')}/payment?mobile=1`
}

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount ?? 0)
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return mobileError(
      'TOPUP_AMOUNT_INVALID',
      `Сумма должна быть от ${MIN_AMOUNT} до ${MAX_AMOUNT} руб.`,
      400,
      'amount'
    )
  }
  if (!isYookassaConfigured()) {
    return mobileError('PAYMENT_UNAVAILABLE', 'ЮKassa не настроена', 503)
  }
  await dbConnect()
  const user = await Users.findOne(
    getMobileBillingUserFilter({
      userId: context.user._id,
      tenantId: context.tenantId,
    })
  )
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)

  const idempotenceKey = crypto.randomUUID()
  const payment = await Payments.create({
    userId: user._id,
    tenantId: context.tenantId,
    tariffId: null,
    amount,
    type: 'topup',
    source: 'yookassa',
    status: 'pending',
    purpose: 'balance',
    provider: 'yookassa',
    idempotenceKey,
    comment: 'Пополнение баланса ArtistCRM из Android',
  })
  try {
    const providerPayment = await createYookassaPayment({
      amount,
      description: 'Пополнение баланса ArtistCRM',
      idempotenceKey,
      returnUrl: getReturnUrl(req),
      user,
      metadata: {
        paymentId: String(payment._id),
        userId: String(user._id),
        tenantId: String(context.tenantId),
        purpose: 'balance',
      },
    })
    payment.providerPaymentId = providerPayment.id || ''
    payment.rawProviderStatus = providerPayment.status || ''
    await payment.save()
    const confirmationUrl = providerPayment?.confirmation?.confirmation_url || ''
    if (!confirmationUrl) throw new Error('ЮKassa не вернула ссылку на оплату')
    return mobileSuccess(
      {
        paymentId: String(payment._id),
        status: providerPayment.status || 'pending',
        amount: normalizeAmount(amount),
        confirmationUrl,
      },
      201
    )
  } catch (error) {
    payment.status = 'failed'
    payment.rawProviderStatus = 'create_failed'
    await payment.save()
    return mobileError(
      'PAYMENT_CREATE_FAILED',
      error?.message || 'Не удалось создать платёж',
      502
    )
  }
}
