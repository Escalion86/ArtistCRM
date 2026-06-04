import test from 'node:test'
import assert from 'node:assert/strict'
import { getStatisticsMonthDetails } from './getStatisticsMonthDetails.js'

test('returns events, transactions and summary for selected month', () => {
  const mayEvent = {
    _id: 'event-may',
    eventDate: '2026-05-10T18:00:00.000Z',
    contractSum: 10000,
  }
  const juneEvent = {
    _id: 'event-june',
    eventDate: '2026-06-12T18:00:00.000Z',
    contractSum: 20000,
  }
  const mayIncome = {
    _id: 'tx-1',
    eventId: 'event-may',
    type: 'income',
    amount: 7000,
  }
  const mayExpense = {
    _id: 'tx-2',
    eventId: 'event-may',
    type: 'expense',
    amount: 1500,
  }
  const juneIncome = {
    _id: 'tx-3',
    eventId: 'event-june',
    type: 'income',
    amount: 20000,
  }

  const eventFinanceMap = new Map([
    ['event-may', { income: 7000, expense: 1500 }],
    ['event-june', { income: 20000, expense: 0 }],
  ])

  const result = getStatisticsMonthDetails({
    monthKey: '2026-05',
    filteredEvents: [mayEvent, juneEvent],
    filteredTransactions: [mayIncome, mayExpense, juneIncome],
    eventFinanceMap,
  })

  assert.deepEqual(
    result.events.map((event) => event._id),
    ['event-may']
  )
  assert.deepEqual(
    result.transactions.map((transaction) => transaction._id),
    ['tx-1', 'tx-2']
  )
  assert.equal(result.summary.totalIncome, 7000)
  assert.equal(result.summary.totalExpense, 1500)
  assert.equal(result.summary.profit, 5500)
  assert.equal(result.summary.paymentLeft, 3000)
  assert.equal(result.summary.depositPaid, 7000)
})

test('returns empty details for unknown month', () => {
  const result = getStatisticsMonthDetails({
    monthKey: '2026-07',
    filteredEvents: [
      { _id: 'event-may', eventDate: '2026-05-10T18:00:00.000Z' },
    ],
    filteredTransactions: [{ _id: 'tx-1', eventId: 'event-may', amount: 1000 }],
    eventFinanceMap: new Map(),
  })

  assert.equal(result.events.length, 0)
  assert.equal(result.transactions.length, 0)
  assert.deepEqual(result.summary, {
    totalIncome: 0,
    totalExpense: 0,
    profit: 0,
    paymentLeft: 0,
    depositPaid: 0,
  })
})
