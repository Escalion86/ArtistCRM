import Payments from '@models/Payments'
import Tariffs from '@models/Tariffs'
import Users from '@models/Users'
import { addMonths, calculateTariffCredit } from './billingCalculations.js'

const applyTariffPurchase = async ({ userId, tariffId, skipCompensation = false }) => {
  if (!userId || !tariffId) {
    return { ok: false, error: 'Не указан пользователь или тариф' }
  }

  const user = await Users.findById(userId)
  if (!user) return { ok: false, error: 'Пользователь не найден' }

  const tariff = await Tariffs.findById(tariffId).lean()
  if (!tariff) return { ok: false, error: 'Тариф не найден' }

  const now = new Date()
  const currentTariff =
    user.tariffId && user.tariffActiveUntil
      ? await Tariffs.findById(user.tariffId).lean()
      : null

  const creditAmount = skipCompensation
    ? 0
    : calculateTariffCredit({
        currentTariff,
        tariffActiveUntil: user.tariffActiveUntil,
        now,
      })

  const price = Number(tariff.price ?? 0)
  const balance = Number(user.balance ?? 0)
  const availableBalance = balance + creditAmount

  if (price > 0 && (!Number.isFinite(availableBalance) || availableBalance < price)) {
    return {
      ok: false,
      error: `Недостаточно средств. Не хватает ${Math.max(price - availableBalance, 0)} руб.`,
    }
  }

  if (creditAmount > 0 && currentTariff) {
    user.balance = availableBalance
    await Payments.create({
      userId: user._id,
      tenantId: user.tenantId ?? user._id,
      tariffId: currentTariff._id,
      amount: creditAmount,
      type: 'refund',
      source: 'system',
      purpose: 'system',
      comment: `Компенсация за неиспользованный период тарифа "${currentTariff.title}"`,
    })
  }

  if (price > 0) {
    const nextChargeAt = addMonths(now, 1)
    user.tariffId = tariff._id
    user.balance = Number(user.balance ?? 0) - price
    user.billingStatus = 'active'
    user.tariffActiveUntil = nextChargeAt
    user.nextChargeAt = nextChargeAt

    await Payments.create({
      userId: user._id,
      tenantId: user.tenantId ?? user._id,
      tariffId: tariff._id,
      amount: price,
      type: 'charge',
      source: 'system',
      purpose: 'tariff',
      comment: `Оплата тарифа "${tariff.title}"`,
    })
  } else {
    user.tariffId = tariff._id
    user.billingStatus = 'active'
    user.tariffActiveUntil = null
    user.nextChargeAt = null
  }

  await user.save()
  return { ok: true, user, tariff }
}

export { addMonths, applyTariffPurchase }
