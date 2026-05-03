import Payments from '@models/Payments'
import Users from '@models/Users'
import { applyTariffPurchase } from '@server/billing'
import { getYookassaPayment, normalizeAmount } from '@server/yookassa'

const processSucceededYookassaPayment = async ({ payment, providerPayment }) => {
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

const syncYookassaPayment = async ({ providerPaymentId, paymentId }) => {
  const query = {
    provider: 'yookassa',
  }
  if (providerPaymentId) query.providerPaymentId = providerPaymentId
  else if (paymentId) query._id = paymentId
  else return { ok: false, error: 'payment_id_required' }

  const payment = await Payments.findOne(query)
  if (!payment) return { ok: false, error: 'payment_not_found' }
  if (!payment.providerPaymentId) {
    return { ok: false, error: 'provider_payment_id_missing' }
  }

  const providerPayment = await getYookassaPayment(payment.providerPaymentId)
  payment.rawProviderStatus = providerPayment?.status || ''

  if (providerPayment?.status === 'succeeded' && providerPayment?.paid === true) {
    return processSucceededYookassaPayment({ payment, providerPayment })
  }

  if (providerPayment?.status === 'canceled') {
    if (payment.status === 'pending') {
      payment.status = 'canceled'
      await payment.save()
    }
    return { ok: true, status: 'canceled' }
  }

  await payment.save()
  return { ok: true, status: providerPayment?.status || payment.status }
}

export { processSucceededYookassaPayment, syncYookassaPayment }
