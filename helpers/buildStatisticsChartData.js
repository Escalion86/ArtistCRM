import { MONTHS_FULL_1 } from './constants.js'

const isValidDate = (value) => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

const buildMonthLabel = (date) => MONTHS_FULL_1[date.getMonth()]

const getMonthKey = (date, year) =>
  `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const buildStatisticsChartData = ({
  selectedYear,
  filteredEvents = [],
  filteredTransactions = [],
  eventsMap = new Map(),
  eventFinanceMap = new Map(),
  currentDate = new Date(),
}) => {
  if (!selectedYear) return []

  const byMonth = new Map()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const isFutureMonth = (monthIndex) =>
    selectedYear > currentYear ||
    (selectedYear === currentYear && monthIndex > currentMonth)
  const isOpenCurrentMonth = (monthIndex) =>
    selectedYear === currentYear && monthIndex === currentMonth
  const isUnfinishedMonth = (monthIndex) =>
    isFutureMonth(monthIndex) || isOpenCurrentMonth(monthIndex)

  filteredEvents.forEach((event) => {
    if (!event?.eventDate || !isValidDate(event.eventDate)) return
    const date = new Date(event.eventDate)
    const key = getMonthKey(date, selectedYear)
    const label = buildMonthLabel(date)

    if (!byMonth.has(key)) {
      byMonth.set(key, {
        monthKey: key,
        month: label,
        income: 0,
        expense: 0,
        profit: 0,
        isFuture: isFutureMonth(date.getMonth()),
        isOpenMonth: isOpenCurrentMonth(date.getMonth()),
        isUnfinished: isUnfinishedMonth(date.getMonth()),
        plannedIncome: 0,
        paymentLeft: 0,
      })
    }

    const bucket = byMonth.get(key)
    const finance = eventFinanceMap.get(event?._id) || {
      income: 0,
      expense: 0,
    }
    const paid = Math.max(Number(finance.income ?? 0), 0)
    const contractSum = Number(event?.contractSum ?? 0)

    if (bucket.isFuture) {
      bucket.plannedIncome += finance.income - finance.expense
    }

    bucket.paymentLeft += Math.max(contractSum - paid, 0)
  })

  filteredTransactions.forEach((transaction) => {
    if (!transaction?.eventId) return
    const event = eventsMap.get(transaction.eventId)
    if (!event?.eventDate || !isValidDate(event.eventDate)) return
    const date = new Date(event.eventDate)
    const key = getMonthKey(date, selectedYear)
    const label = buildMonthLabel(date)

    if (!byMonth.has(key)) {
      byMonth.set(key, {
        monthKey: key,
        month: label,
        income: 0,
        expense: 0,
        profit: 0,
        isFuture: isFutureMonth(date.getMonth()),
        isOpenMonth: isOpenCurrentMonth(date.getMonth()),
        isUnfinished: isUnfinishedMonth(date.getMonth()),
        plannedIncome: 0,
        paymentLeft: 0,
      })
    }

    const bucket = byMonth.get(key)
    if (bucket.isFuture) return
    const amount = Number(transaction.amount ?? 0)
    if (transaction.type === 'income') bucket.income += amount
    if (transaction.type === 'expense') bucket.expense += amount
    bucket.profit = bucket.income - bucket.expense
  })

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => {
      if (value.isFuture) {
        return {
          ...value,
          profit: Number(value.plannedIncome ?? 0),
        }
      }
      return value
    })
}
