import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTombstoneUpdate, TOMBSTONE_TTL_MS } from './syncTombstone.js'

test('tombstone повышает версию монотонно через $max и получает TTL', () => {
  const now = new Date('2026-07-15T12:00:00.000Z')
  const update = buildTombstoneUpdate({ tenantId: 'tenant-a', version: 7, now })
  assert.deepEqual(update.$max, { version: 8 })
  assert.equal(update.$set.deletedAt, now)
  assert.equal(update.$set.purgeAt.getTime(), now.getTime() + TOMBSTONE_TTL_MS)
  assert.deepEqual(update.$setOnInsert, { tenantId: 'tenant-a' })
})
