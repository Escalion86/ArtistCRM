const isValidDate = (value) => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

const getMonthKeyFromValue = (value) => {
  if (!isValidDate(value)) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const getStatisticsMonthDetails = ({
  monthKey,
  filteredEvents = [],
  filteredTransactions = [],
  eventFinanceMap = new Map(),
}) => {
  const events = filteredEvents.filter(
    (event) => getMonthKeyFromValue(event?.eventDate) === monthKey
  )
  const eventIds = new Set(events.map((event) => event?._id).filter(Boolean))
  const transactions = filteredTransactions.filter((transaction) =>
    eventIds.has(transaction?.eventId)
  )

  const totalIncome = transactions
    .filter((transaction) => transaction?.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0)
  const totalExpense = transactions
    .filter((transaction) => transaction?.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0)

  const paymentLeft = events.reduce((sum, event) => {
    const finance = eventFinanceMap.get(event?._id) || { income: 0, expense: 0 }
    const paid = Math.max(Number(finance.income ?? 0), 0)
    return sum + Math.max(Number(event?.contractSum ?? 0) - paid, 0)
  }, 0)

  const depositPaid = events.reduce((sum, event) => {
    const finance = eventFinanceMap.get(event?._id) || { income: 0, expense: 0 }
    return sum + Math.max(Number(finance.income ?? 0), 0)
  }, 0)

  return {
    events,
    transactions,
    summary: {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      paymentLeft,
      depositPaid,
    },
  }
}
