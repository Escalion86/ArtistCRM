import type { Event, Transaction } from './types'

export const TRANSACTION_CATEGORIES = [
  { value: 'deposit', label: 'Задаток', type: 'income' },
  { value: 'final_payment', label: 'Остаток оплаты', type: 'income' },
  { value: 'referral_in', label: 'Рекомендация (входящий %)', type: 'income' },
  { value: 'tips', label: 'Чаевые', type: 'income' },
  { value: 'referral_out', label: 'Рекомендация (исходящий %)', type: 'expense' },
  { value: 'refund', label: 'Возврат клиенту', type: 'expense' },
  { value: 'organizer', label: 'Организатору', type: 'expense' },
  { value: 'travel', label: 'Дорога', type: 'expense' },
  { value: 'taxes', label: 'Налоги', type: 'expense' },
  { value: 'expense', label: 'Расходники', type: 'expense' },
  { value: 'other', label: 'Другое', type: 'both' },
] as const

export const categoryLabel = (value?: string) =>
  TRANSACTION_CATEGORIES.find((item) => item.value === value)?.label || value || 'Без категории'

export const parseTransactionDateInput = (value: string) => {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined
  return date.toISOString()
}

export const formatTransactionDateInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export const summarizeTransactions = (transactions: Transaction[]) => transactions.reduce(
  (summary, transaction) => {
    const amount = Number(transaction.amount || 0)
    if (transaction.paymentMethod === 'obligation') {
      summary.obligation += amount
    } else if (transaction.type === 'income') {
      summary.income += amount
    } else {
      summary.expense += amount
    }
    return summary
  },
  { income: 0, expense: 0, obligation: 0 },
)

export type EventPaymentControl = {
  event: Event
  paid: number
  contractRemaining: number
  depositPaid: number
  depositRemaining: number
  depositPending: boolean
}

export const buildEventPaymentControl = (
  events: Event[],
  transactions: Transaction[],
): EventPaymentControl[] => events
  .filter((event) => event.status !== 'canceled' && event.status !== 'draft')
  .map((event) => {
    const related = transactions.filter((transaction) =>
      transaction.eventId === event._id && transaction.paymentMethod !== 'obligation')
    const clientPayments = related
      .filter((transaction) => transaction.type === 'income' &&
        ['deposit', 'advance', 'final_payment', 'client_payment'].includes(transaction.category || ''))
    const paid = clientPayments
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    const depositPaid = clientPayments
      .filter((transaction) => ['deposit', 'advance'].includes(transaction.category || ''))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    const depositExpected = Number(event.depositExpectedAmount || 0)
    return {
      event,
      paid,
      contractRemaining: Math.max(0, Number(event.contractSum || 0) - paid),
      depositPaid,
      depositRemaining: event.waitDeposit
        ? Math.max(0, depositExpected - depositPaid)
        : 0,
      depositPending: Boolean(event.waitDeposit && (depositExpected <= 0 || depositPaid < depositExpected)),
    }
  })
  .filter((row) => row.contractRemaining > 0 || row.depositPending)
  .sort((a, b) => new Date(a.event.eventDate || 0).getTime() - new Date(b.event.eventDate || 0).getTime())
