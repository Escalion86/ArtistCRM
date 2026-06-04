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
