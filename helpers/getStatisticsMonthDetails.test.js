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
  assert.equal(result.summary.hasUnderpaidEvents, true)
  assert.deepEqual(result.summary.eventStatusCounts, {
    draft: 0,
    confirmed: 0,
    finished: 1,
    canceled: 0,
  })
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
    hasUnderpaidEvents: false,
    eventStatusCounts: {
      draft: 0,
      confirmed: 0,
      finished: 0,
      canceled: 0,
    },
    transferredEventStatusCounts: {
      draft: 0,
      confirmed: 0,
      finished: 0,
      canceled: 0,
    },
  })
})

test('includes unlinked transactions in selected month by transaction date', () => {
  const result = getStatisticsMonthDetails({
    monthKey: '2026-05',
    filteredEvents: [],
    filteredTransactions: [
      {
        _id: 'tx-props',
        eventId: null,
        type: 'expense',
        amount: 3000,
        date: '2026-05-12T10:00:00.000Z',
      },
      {
        _id: 'tx-other-month',
        eventId: null,
        type: 'expense',
        amount: 1000,
        date: '2026-06-12T10:00:00.000Z',
      },
    ],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(
    result.transactions.map((transaction) => transaction._id),
    ['tx-props']
  )
  assert.equal(result.summary.totalExpense, 3000)
  assert.equal(result.summary.profit, -3000)
})

test('marks month as not underpaid when all events are fully paid', () => {
  const result = getStatisticsMonthDetails({
    monthKey: '2026-05',
    filteredEvents: [
      {
        _id: 'event-paid',
        eventDate: '2026-05-10T18:00:00.000Z',
        contractSum: 10000,
      },
    ],
    filteredTransactions: [
      {
        _id: 'tx-paid',
        eventId: 'event-paid',
        type: 'income',
        amount: 10000,
      },
    ],
    eventFinanceMap: new Map([['event-paid', { income: 10000, expense: 0 }]]),
  })

  assert.equal(result.summary.paymentLeft, 0)
  assert.equal(result.summary.hasUnderpaidEvents, false)
})

test('sorts month events and transactions from earliest to latest', () => {
  const result = getStatisticsMonthDetails({
    monthKey: '2026-05',
    filteredEvents: [
      {
        _id: 'event-late',
        eventDate: '2026-05-25T20:00:00.000Z',
      },
      {
        _id: 'event-early',
        eventDate: '2026-05-01T10:00:00.000Z',
      },
      {
        _id: 'event-middle',
        eventDate: '2026-05-12T15:00:00.000Z',
      },
    ],
    filteredTransactions: [
      {
        _id: 'tx-late',
        eventId: 'event-late',
        type: 'income',
        amount: 3000,
        date: '2026-05-25T21:00:00.000Z',
      },
      {
        _id: 'tx-early',
        eventId: 'event-early',
        type: 'income',
        amount: 1000,
        date: '2026-05-01T11:00:00.000Z',
      },
      {
        _id: 'tx-middle',
        eventId: 'event-middle',
        type: 'income',
        amount: 2000,
        date: '2026-05-12T16:00:00.000Z',
      },
    ],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(
    result.events.map((event) => event._id),
    ['event-early', 'event-middle', 'event-late']
  )
  assert.deepEqual(
    result.transactions.map((transaction) => transaction._id),
    ['tx-early', 'tx-middle', 'tx-late']
  )
})

test('returns month event status counts by status and date', () => {
  const now = new Date('2026-06-19T12:00:00.000Z').getTime()

  const result = getStatisticsMonthDetails({
    monthKey: '2026-06',
    now,
    filteredEvents: [
      {
        _id: 'draft-past',
        status: 'draft',
        eventDate: '2026-06-01T10:00:00.000Z',
      },
      {
        _id: 'canceled-future',
        status: 'canceled',
        eventDate: '2026-06-25T10:00:00.000Z',
      },
      {
        _id: 'active-past',
        status: 'active',
        eventDate: '2026-06-05T10:00:00.000Z',
      },
      {
        _id: 'closed-past',
        status: 'closed',
        dateEnd: '2026-06-06T12:00:00.000Z',
        eventDate: '2026-06-06T10:00:00.000Z',
      },
      {
        _id: 'active-future',
        status: 'active',
        eventDate: '2026-06-25T10:00:00.000Z',
      },
      {
        _id: 'active-without-date',
        status: 'active',
        eventDate: '2026-06-15T10:00:00.000Z',
        dateEnd: 'not-a-date',
      },
    ],
    filteredTransactions: [],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(result.summary.eventStatusCounts, {
    draft: 1,
    confirmed: 2,
    finished: 2,
    canceled: 1,
  })
})

test('returns transferred month event status counts', () => {
  const now = new Date('2026-06-19T12:00:00.000Z').getTime()

  const result = getStatisticsMonthDetails({
    monthKey: '2026-06',
    now,
    filteredEvents: [
      {
        _id: 'regular-finished',
        status: 'active',
        eventDate: '2026-06-05T10:00:00.000Z',
      },
      {
        _id: 'transferred-finished',
        status: 'active',
        eventDate: '2026-06-06T10:00:00.000Z',
        isTransferred: true,
      },
      {
        _id: 'transferred-confirmed',
        status: 'active',
        eventDate: '2026-06-25T10:00:00.000Z',
        isTransferred: true,
      },
      {
        _id: 'transferred-draft',
        status: 'draft',
        eventDate: '2026-06-26T10:00:00.000Z',
        isTransferred: true,
      },
      {
        _id: 'transferred-canceled',
        status: 'canceled',
        eventDate: '2026-06-27T10:00:00.000Z',
        isTransferred: true,
      },
    ],
    filteredTransactions: [],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(result.summary.eventStatusCounts, {
    draft: 0,
    confirmed: 0,
    finished: 1,
    canceled: 0,
  })
  assert.deepEqual(result.summary.transferredEventStatusCounts, {
    draft: 1,
    confirmed: 1,
    finished: 1,
    canceled: 1,
  })
})
