import test from 'node:test'
import assert from 'node:assert/strict'
import { applyUserEventStats } from './userEventStats.js'

test('applyUserEventStats separates created events and requests by tenant', () => {
  const users = [
    { _id: 'user-1', firstName: 'One' },
    { _id: 'user-2', firstName: 'Two' },
    { _id: 'user-3', firstName: 'Three' },
  ]
  const stats = [
    { tenantId: 'user-1', status: 'active', count: 2 },
    { tenantId: 'user-1', status: 'draft', count: 3 },
    { tenantId: 'user-1', status: 'closed', count: 1 },
    { tenantId: 'user-2', status: 'draft', count: 4 },
  ]

  assert.deepEqual(applyUserEventStats(users, stats), [
    { _id: 'user-1', firstName: 'One', eventsCount: 3, requestsCount: 3 },
    { _id: 'user-2', firstName: 'Two', eventsCount: 0, requestsCount: 4 },
    { _id: 'user-3', firstName: 'Three', eventsCount: 0, requestsCount: 0 },
  ])
})
