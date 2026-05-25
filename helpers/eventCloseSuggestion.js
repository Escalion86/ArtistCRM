const CLOSED_BLOCKED_STATUSES = new Set(['draft', 'canceled', 'closed'])

const normalizeTransactions = (transactions) =>
  Array.isArray(transactions) ? transactions : []

const getIncomeTotal = (transactions) =>
  normalizeTransactions(transactions)
    .filter((item) => item?.type === 'income')
    .reduce((sum, item) => sum + Number(item?.amount ?? 0), 0)

const hasTaxesTransaction = (transactions) =>
  normalizeTransactions(transactions).some((item) => item?.category === 'taxes')

const isFinishedByDate = (event, now = new Date()) => {
  const endValue = event?.dateEnd ?? event?.eventDate ?? null
  if (!endValue) return false

  const endDate = new Date(endValue)
  if (Number.isNaN(endDate.getTime())) return false

  return endDate.getTime() < now.getTime()
}

export const getEventCloseSuggestionState = (
  event,
  transactions = [],
  now = new Date()
) => {
  const incomeTotal = getIncomeTotal(transactions)
  const hasTaxes = hasTaxesTransaction(transactions)
  const isEventFinished = isFinishedByDate(event, now)
  const contractSum = Number(event?.contractSum ?? 0)
  const canClose =
    contractSum <= incomeTotal && (!event?.isByContract || hasTaxes)
  const blockedStatus = CLOSED_BLOCKED_STATUSES.has(String(event?.status ?? ''))

  return {
    incomeTotal,
    hasTaxes,
    canClose,
    isEventFinished,
    shouldSuggestClosing: !blockedStatus && isEventFinished && canClose,
  }
}

