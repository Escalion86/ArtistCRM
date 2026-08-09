const parseBoundaryDate = (value, endOfDay = false) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setHours(23, 59, 59, 999)
  else date.setHours(0, 0, 0, 0)
  return date
}

const isInDateRange = (transaction, dateFrom, dateTo) => {
  const from = parseBoundaryDate(dateFrom)
  const to = parseBoundaryDate(dateTo, true)
  if (!from && !to) return true
  if (!transaction?.date) return false
  const date = new Date(transaction.date)
  if (Number.isNaN(date.getTime())) return false
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

const matchesTypeFilter = (transaction, typeFilter = {}) => {
  const isObligation = transaction?.paymentMethod === 'obligation'
  const hasExplicitTypeFilter = ['income', 'expense', 'obligation'].some(
    (key) => key in typeFilter
  )
  if (!hasExplicitTypeFilter) return true

  const hasExplicitObligationFilter = 'obligation' in typeFilter
  const obligationEnabled = hasExplicitObligationFilter
    ? Boolean(typeFilter.obligation)
    : true
  const incomeEnabled = Boolean(typeFilter.income)
  const expenseEnabled = Boolean(typeFilter.expense)

  if (isObligation) return obligationEnabled
  if (incomeEnabled && transaction?.type === 'income') return true
  if (expenseEnabled && transaction?.type === 'expense') return true
  return false
}

const matchesRelationFilter = (transaction, relationFilter = {}) => {
  if (relationFilter.linked && relationFilter.unlinked) return true
  const hasRelation = Boolean(transaction?.eventId || transaction?.clientId)
  if (relationFilter.linked && hasRelation) return true
  if (relationFilter.unlinked && !hasRelation) return true
  return false
}

export const filterTransactions = ({
  transactions = [],
  typeFilter = {},
  relationFilter = {},
  dateFrom = '',
  dateTo = '',
} = {}) =>
  (Array.isArray(transactions) ? transactions : []).filter(
    (transaction) =>
      matchesTypeFilter(transaction, typeFilter) &&
      matchesRelationFilter(transaction, relationFilter) &&
      isInDateRange(transaction, dateFrom, dateTo)
  )
