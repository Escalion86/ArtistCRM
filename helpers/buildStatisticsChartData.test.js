import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStatisticsChartData } from './buildStatisticsChartData.js'

test('uses all month unpaid amounts for open current month', () => {
  const events = [
    {
      _id: 'event-1',
      eventDate: '2026-06-10T18:00:00.000Z',
      contractSum: 100000,
      status: 'active',
    },
    {
      _id: 'event-2',
      eventDate: '2026-06-20T18:00:00.000Z',
      contractSum: 133000,
      status: 'active',
    },
  ]

  const transactions = [
    { _id: 'tx-1', eventId: 'event-1', type: 'income', amount: 7000 },
    { _id: 'tx-2', eventId: 'event-2', type: 'income', amount: 0 },
  ]

  const eventFinanceMap = new Map([
    ['event-1', { income: 7000, expense: 0 }],
    ['event-2', { income: 0, expense: 0 }],
  ])

  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: events,
    filteredTransactions: transactions,
    eventsMap: new Map(events.map((event) => [event._id, event])),
    eventFinanceMap,
    currentDate: new Date('2026-06-05T12:00:00.000Z'),
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].monthKey, '2026-06')
  assert.equal(result[0].paymentLeft, 226000)
})

test('adds unlinked transactions to profit by transaction date month', () => {
  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: [],
    filteredTransactions: [
      {
        _id: 'tx-fuel',
        eventId: null,
        type: 'expense',
        amount: 2500,
        date: '2026-03-15T10:00:00.000Z',
      },
      {
        _id: 'tx-extra',
        eventId: '',
        type: 'income',
        amount: 7000,
        date: '2026-03-20T10:00:00.000Z',
      },
    ],
    eventsMap: new Map(),
    eventFinanceMap: new Map(),
  })

  const march = result.find((item) => item.monthKey === '2026-03')
  assert.equal(march.income, 7000)
  assert.equal(march.expense, 2500)
  assert.equal(march.profit, 4500)
})

test('counts month events for chart labels without canceled events', () => {
  const events = [
    {
      _id: 'event-active',
      eventDate: '2026-04-10T18:00:00.000Z',
      status: 'active',
      contractSum: 10000,
    },
    {
      _id: 'event-draft',
      eventDate: '2026-04-12T18:00:00.000Z',
      status: 'draft',
      contractSum: 5000,
    },
    {
      _id: 'event-canceled',
      eventDate: '2026-04-15T18:00:00.000Z',
      status: 'canceled',
      contractSum: 20000,
    },
  ]

  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: events,
    filteredTransactions: [
      {
        _id: 'tx-active',
        eventId: 'event-active',
        type: 'income',
        amount: 10000,
      },
      {
        _id: 'tx-draft',
        eventId: 'event-draft',
        type: 'income',
        amount: 1000,
      },
      {
        _id: 'tx-canceled',
        eventId: 'event-canceled',
        type: 'income',
        amount: 20000,
      },
    ],
    eventsMap: new Map(events.map((event) => [event._id, event])),
    eventFinanceMap: new Map([
      ['event-active', { income: 10000, expense: 0 }],
      ['event-draft', { income: 1000, expense: 0 }],
      ['event-canceled', { income: 20000, expense: 0 }],
    ]),
    currentDate: new Date('2026-04-01T12:00:00.000Z'),
  })

  const april = result.find((item) => item.monthKey === '2026-04')
  assert.equal(april.eventCount, 2)
})

test('adds month event count breakdown for chart tooltip', () => {
  const events = [
    {
      _id: 'event-finished',
      eventDate: '2026-04-10T18:00:00.000Z',
      status: 'active',
      contractSum: 10000,
    },
    {
      _id: 'event-planned',
      eventDate: '2026-04-25T18:00:00.000Z',
      status: 'active',
      contractSum: 10000,
    },
    {
      _id: 'event-draft',
      eventDate: '2026-04-26T18:00:00.000Z',
      status: 'draft',
      contractSum: 10000,
    },
    {
      _id: 'event-canceled',
      eventDate: '2026-04-27T18:00:00.000Z',
      status: 'canceled',
      contractSum: 10000,
    },
  ]

  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: events.filter((event) => event.status !== 'canceled'),
    countEvents: events,
    filteredTransactions: [
      {
        _id: 'tx-finished',
        eventId: 'event-finished',
        type: 'income',
        amount: 10000,
      },
    ],
    eventsMap: new Map(events.map((event) => [event._id, event])),
    eventFinanceMap: new Map([
      ['event-finished', { income: 10000, expense: 0 }],
      ['event-planned', { income: 0, expense: 0 }],
      ['event-draft', { income: 0, expense: 0 }],
    ]),
    currentDate: new Date('2026-04-20T12:00:00.000Z'),
  })

  const april = result.find((item) => item.monthKey === '2026-04')
  assert.deepEqual(april.eventCounts, {
    finished: 1,
    planned: 1,
    draft: 1,
    canceled: 1,
  })
  assert.equal(april.eventCount, 3)
})

test('shows empty months only between months with events', () => {
  const events = [
    {
      _id: 'event-march',
      eventDate: '2026-03-10T18:00:00.000Z',
      status: 'active',
      contractSum: 10000,
    },
    {
      _id: 'event-june',
      eventDate: '2026-06-10T18:00:00.000Z',
      status: 'active',
      contractSum: 10000,
    },
  ]

  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: events,
    filteredTransactions: [
      {
        _id: 'tx-march',
        eventId: 'event-march',
        type: 'income',
        amount: 10000,
      },
      {
        _id: 'tx-september',
        eventId: null,
        type: 'expense',
        amount: 5000,
        date: '2026-09-10T18:00:00.000Z',
      },
      {
        _id: 'tx-october',
        eventId: null,
        type: 'expense',
        amount: 5000,
        date: '2026-10-10T18:00:00.000Z',
      },
    ],
    eventsMap: new Map(events.map((event) => [event._id, event])),
    eventFinanceMap: new Map([
      ['event-march', { income: 10000, expense: 0 }],
      ['event-june', { income: 0, expense: 0 }],
    ]),
    currentDate: new Date('2026-06-19T12:00:00.000Z'),
  })

  assert.deepEqual(
    result.map((item) => item.monthKey),
    ['2026-03', '2026-04', '2026-05', '2026-06']
  )
  assert.deepEqual(
    result.map((item) => item.eventCount),
    [1, 0, 0, 1]
  )
})
