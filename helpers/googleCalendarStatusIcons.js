const normalizeTransactions = (transactions) =>
  Array.isArray(transactions) ? transactions : []

export const buildGoogleCalendarStatusIconsPrefix = (
  event,
  transactions = []
) => {
  const totalIncome = normalizeTransactions(transactions)
    .filter((item) => item?.type === 'income')
    .reduce((sum, item) => sum + Number(item?.amount ?? 0), 0)
  const contractSum = Number(event?.contractSum ?? 0)
  const isFullyPaid = contractSum > 0 && totalIncome >= contractSum
  const isPartiallyPaid = totalIncome > 0 && !isFullyPaid
  const icons = []

  if (isFullyPaid) icons.push('✅')
  else if (isPartiallyPaid) icons.push('☑️')

  if (Boolean(event?.isByContract)) icons.push('📄')
  if (Boolean(event?.isTransferred)) icons.push('➡️')

  return icons.length > 0 ? `${icons.join('')} ` : ''
}

export const shouldSkipGoogleCalendarEventSync = (event, settings = {}) =>
  (event?.status === 'canceled' &&
    Boolean(settings?.deleteCanceledFromCalendar)) ||
  (Boolean(event?.isTransferred) &&
    Boolean(settings?.skipTransferredFromCalendar))
