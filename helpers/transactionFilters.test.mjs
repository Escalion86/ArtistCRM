import test from 'node:test'
import assert from 'node:assert/strict'

import { filterTransactions } from './transactionFilters.js'

const baseFilters = {
  typeFilter: { income: true, expense: true },
  relationFilter: { linked: true, unlinked: true },
}

test('filterTransactions keeps all transactions when date range is empty', () => {
  const result = filterTransactions({
    transactions: [
      { _id: 'tx-1', type: 'income', date: '2026-06-01T10:00:00.000Z' },
      { _id: 'tx-2', type: 'expense', date: '2026-06-02T10:00:00.000Z' },
    ],
    ...baseFilters,
    dateFrom: '',
    dateTo: '',
  })

  assert.deepEqual(
    result.map((item) => item._id),
    ['tx-1', 'tx-2']
  )
})

test('filterTransactions applies inclusive date range by transaction day', () => {
  const result = filterTransactions({
    transactions: [
      { _id: 'before', type: 'expense', date: '2026-05-31T12:00:00.000Z' },
      { _id: 'start', type: 'expense', date: '2026-06-01T00:00:00.000Z' },
      { _id: 'inside', type: 'expense', date: '2026-06-10T12:00:00.000Z' },
      { _id: 'end', type: 'expense', date: '2026-06-30T12:00:00.000Z' },
      { _id: 'after', type: 'expense', date: '2026-07-01T00:00:00.000Z' },
    ],
    ...baseFilters,
    dateFrom: '2026-06-01',
    dateTo: '2026-06-30',
  })

  assert.deepEqual(
    result.map((item) => item._id),
    ['start', 'inside', 'end']
  )
})

test('filterTransactions combines date, type and relation filters', () => {
  const result = filterTransactions({
    transactions: [
      {
        _id: 'linked-income',
        type: 'income',
        eventId: 'event-1',
        date: '2026-06-10T12:00:00.000Z',
      },
      {
        _id: 'unlinked-income',
        type: 'income',
        eventId: null,
        clientId: null,
        date: '2026-06-12T12:00:00.000Z',
      },
      {
        _id: 'unlinked-expense',
        type: 'expense',
        eventId: null,
        clientId: null,
        date: '2026-06-12T12:00:00.000Z',
      },
    ],
    typeFilter: { income: false, expense: true },
    relationFilter: { linked: false, unlinked: true },
    dateFrom: '2026-06-01',
    dateTo: '2026-06-30',
  })

  assert.deepEqual(
    result.map((item) => item._id),
    ['unlinked-expense']
  )
})
