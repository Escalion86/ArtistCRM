import test from 'node:test'
import assert from 'node:assert/strict'

import { getEventStatusFlags } from './eventStatusFilter.js'

const pastDate = new Date('2026-01-10T10:00:00.000Z')
const futureDate = new Date('2026-08-10T10:00:00.000Z')
const now = new Date('2026-06-25T10:00:00.000Z')

test('marks transferred event as separate filter flag', () => {
  assert.deepEqual(
    getEventStatusFlags(
      { status: 'active', isTransferred: true, dateEnd: pastDate },
      now
    ),
    {
      request: false,
      active: false,
      finished: false,
      closed: false,
      transferred: true,
      canceled: false,
    }
  )
})

test('keeps canceled status primary for transferred canceled event', () => {
  assert.deepEqual(
    getEventStatusFlags(
      { status: 'canceled', isTransferred: true, dateEnd: pastDate },
      now
    ),
    {
      request: false,
      active: false,
      finished: false,
      closed: false,
      transferred: false,
      canceled: true,
    }
  )
})

test('marks active non-transferred future event as active', () => {
  assert.equal(
    getEventStatusFlags({ status: 'active', dateEnd: futureDate }, now).active,
    true
  )
})
