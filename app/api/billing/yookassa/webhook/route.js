import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import Payments from '@models/Payments'
import Users from '@models/Users'
import { applyTariffPurchase } from '@server/billing'
import { getYookassaPayment, normalizeAmount } from '@server/yookassa'

const processSucceededPayment = async ({ payment, providerPayment }) => {
  if (payment.status === 'succeeded') {
    return { ok: true, alreadyProcessed: true }
  }

  const expected = normalizeAmount(payment.amount)
  const received = String(providerPayment?.amount?.value || '')
  if (expected !== received || providerPayment?.amount?.currency !== 'RUB') {
    payment.status = 'failed'
    payment.rawProviderStatus = providerPayment?.status || ''
    payment.comment = `${payment.comment || 'Платеж'}: сумма платежа не совпала`
    await payment.save()
    return { ok: false, error: 'amount_mismatch' }
  }

  const user = await Users.findById(payment.userId)
  if (!user) {
    payment.status = 'failed'
    payment.rawProviderStatus = providerPayment?.status || ''
    payment.comment = `${payment.comment || 'Платеж'}: пользователь не найден`
    await payment.save()
    return { ok: false, error: 'user_not_found' }
  }

  user.balance = Number(user.balance ?? 0) + Number(payment.amount ?? 0)
  await user.save()

  payment.status = 'succeeded'
  payment.rawProviderStatus = providerPayment?.status || ''
  payment.paidAt = providerPayment?.captured_at
    ? new Date(providerPayment.captured_at)
    : new Date()
  await payment.save()

  if (payment.purpose === 'tariff' && payment.tariffId) {
    const result = await applyTariffPurchase({
      userId: payment.userId,
      tariffId: payment.tariffId,
    })
    if (!result.ok) {
      payment.comment = `${payment.comment || 'Платеж'}: баланс пополнен, но тариф не активирован (${result.error})`
      await payment.save()
      return { ok: false, error: result.error }
    }
  }

  return { ok: true }
}

export const POST = async (req) => {
  const secret = String(process.env.YOOKASSA_WEBHOOK_SECRET || '').trim()
  if (secret) {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') || req.headers.get('x-webhook-token')
    if (token !== secret) {
      return NextResponse.json({ success: false }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const providerPaymentId = String(body?.object?.id || '').trim()
  if (!providerPaymentId) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  await dbConnect()

  const payment = await Payments.findOne({
    provider: 'yookassa',
    providerPaymentId,
  })
  if (!payment) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  const providerPayment = await getYookassaPayment(providerPaymentId)
  payment.rawProviderStatus = providerPayment?.status || ''

  if (providerPayment?.status === 'succeeded' && providerPayment?.paid === true) {
    const result = await processSucceededPayment({ payment, providerPayment })
    return NextResponse.json({ success: true, data: result }, { status: 200 })
  }

  if (providerPayment?.status === 'canceled') {
    if (payment.status === 'pending') {
      payment.status = 'canceled'
      await payment.save()
    }
    return NextResponse.json({ success: true }, { status: 200 })
  }

  await payment.save()
  return NextResponse.json({ success: true }, { status: 200 })
}
