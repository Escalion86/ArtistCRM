import assert from 'node:assert/strict'
import test from 'node:test'
import { buildClientEvents } from './clientSignificantDates.js'

test('client anniversaries move from tomorrow to today and then to next year', () => {
  const clients = [
    {
      _id: 'client',
      significantDates: [
        { date: new Date(2000, 8, 9), title: 'День рождения' },
      ],
    },
  ]
  assert.equal(
    buildClientEvents(clients, new Date(2026, 8, 8, 23, 59))[0].daysLeft,
    1
  )
  assert.equal(
    buildClientEvents(clients, new Date(2026, 8, 9, 0, 1))[0].daysLeft,
    0
  )
  assert.equal(
    buildClientEvents(clients, new Date(2026, 8, 10))[0].nextDate.getFullYear(),
    2027
  )
})

test('invalid client dates are ignored', () => {
  assert.deepEqual(
    buildClientEvents([{ significantDates: [{ date: 'invalid' }, {}] }]),
    []
  )
})
