import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPastCompletionQuery,
  buildUpcomingCompletionQuery,
} from './eventScopeQueries.mjs'

test('upcoming query excludes canceled requests without event dates', () => {
  const now = new Date('2026-07-05T10:00:00.000Z')
  const query = buildUpcomingCompletionQuery(now)

  assert.deepEqual(query.$and[0], { status: { $ne: 'canceled' } })
  assert.deepEqual(query.$and[1].$or[2], {
    $and: [
      { $or: [{ dateEnd: null }, { dateEnd: { $exists: false } }] },
      { $or: [{ eventDate: null }, { eventDate: { $exists: false } }] },
    ],
  })
})

test('past query includes canceled requests without event dates', () => {
  const now = new Date('2026-07-05T10:00:00.000Z')
  const query = buildPastCompletionQuery(now)

  assert.deepEqual(query.$or[2], {
    $and: [
      { status: 'canceled' },
      { $or: [{ dateEnd: null }, { dateEnd: { $exists: false } }] },
      { $or: [{ eventDate: null }, { eventDate: { $exists: false } }] },
    ],
  })
})
