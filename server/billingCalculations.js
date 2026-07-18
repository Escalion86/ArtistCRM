const addMonths = (date, count) => {
  const next = new Date(date)
  const day = next.getDate()
  next.setMonth(next.getMonth() + count)
  if (next.getDate() < day) next.setDate(0)
  return next
}

const calculateTariffCredit = ({
  currentTariff,
  tariffActiveUntil,
  now = new Date(),
}) => {
  const currentPrice = Number(currentTariff?.price ?? 0)
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !tariffActiveUntil) {
    return 0
  }
  const activeUntil = new Date(tariffActiveUntil)
  if (Number.isNaN(activeUntil.getTime()) || activeUntil <= now) return 0
  const periodStart = addMonths(activeUntil, -1)
  const periodMs = activeUntil.getTime() - periodStart.getTime()
  const remainingMs = activeUntil.getTime() - now.getTime()
  if (periodMs <= 0 || remainingMs <= 0) return 0
  return Math.floor((currentPrice * remainingMs) / periodMs)
}

const calculateBalanceRunway = ({
  balance,
  tariffPrice,
  tariffActiveUntil,
  now = new Date(),
}) => {
  const normalizedBalance = Math.max(Number(balance ?? 0), 0)
  const price = Number(tariffPrice ?? 0)
  if (!Number.isFinite(price) || price <= 0) {
    return { fundedMonths: null, fundedUntil: null, unlimited: true }
  }
  const activeUntil = tariffActiveUntil ? new Date(tariffActiveUntil) : null
  const paidThrough =
    activeUntil && !Number.isNaN(activeUntil.getTime()) && activeUntil > now
      ? activeUntil
      : now
  const fundedMonths = Math.max(Math.floor(normalizedBalance / price), 0)
  const fundedUntil = addMonths(paidThrough, Math.min(fundedMonths, 1200))
  return {
    fundedMonths,
    fundedUntil: fundedUntil.toISOString(),
    unlimited: fundedMonths > 1200,
  }
}

const calculateTariffChangeQuote = ({
  balance,
  currentTariff,
  tariffActiveUntil,
  targetTariff,
  now = new Date(),
}) => {
  const currentId = currentTariff?._id ? String(currentTariff._id) : ''
  const targetId = targetTariff?._id ? String(targetTariff._id) : ''
  const current = Boolean(currentId && targetId && currentId === targetId)
  const creditAmount = current
    ? 0
    : calculateTariffCredit({ currentTariff, tariffActiveUntil, now })
  const availableBalance = Math.max(Number(balance ?? 0), 0) + creditAmount
  const chargeAmount = Math.max(Number(targetTariff?.price ?? 0), 0)
  const activeUntil = tariffActiveUntil ? new Date(tariffActiveUntil) : null
  const paidTariffActive = Boolean(
    Number(currentTariff?.price ?? 0) > 0 &&
      activeUntil &&
      !Number.isNaN(activeUntil.getTime()) &&
      activeUntil > now
  )
  const blockedReason =
    !current && paidTariffActive && chargeAmount <= 0
      ? 'Оплаченный тариф действует до окончания текущего периода'
      : ''
  return {
    current,
    creditAmount,
    chargeAmount,
    missingAmount: Math.max(chargeAmount - availableBalance, 0),
    balanceAfter: Math.max(availableBalance - chargeAmount, 0),
    blockedReason,
  }
}

export {
  addMonths,
  calculateBalanceRunway,
  calculateTariffChangeQuote,
  calculateTariffCredit,
}
