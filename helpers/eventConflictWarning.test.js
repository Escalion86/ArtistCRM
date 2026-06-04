import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowEventConflictWarning } from './eventConflictWarning.js'

test('shows warning when creating event with conflicts', () => {
  const result = shouldShowEventConflictWarning({
    eventId: null,
    initialEventDate: null,
    initialDateEnd: null,
    eventDate: '2026-06-10T15:00:00.000Z',
    dateEnd: '2026-06-10T17:00:00.000Z',
    conflictsCount: 1,
  })

  assert.equal(result, true)
})

test('does not show warning when editing event without changing time range', () => {
  const result = shouldShowEventConflictWarning({
    eventId: 'evt-1',
    initialEventDate: '2026-06-10T15:00:00.000Z',
    initialDateEnd: '2026-06-10T17:00:00.000Z',
    eventDate: '2026-06-10T15:00:00.000Z',
    dateEnd: '2026-06-10T17:00:00.000Z',
    conflictsCount: 1,
  })

  assert.equal(result, false)
})

test('shows warning when editing event after changing time range', () => {
  const result = shouldShowEventConflictWarning({
    eventId: 'evt-1',
    initialEventDate: '2026-06-10T15:00:00.000Z',
    initialDateEnd: '2026-06-10T17:00:00.000Z',
    eventDate: '2026-06-10T16:00:00.000Z',
    dateEnd: '2026-06-10T18:00:00.000Z',
    conflictsCount: 1,
  })

  assert.equal(result, true)
})
