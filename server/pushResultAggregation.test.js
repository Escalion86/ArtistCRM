import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregatePushResults } from './pushResultAggregation.js'

test('агрегирует доставку Web Push и Android Expo Push', () => {
  const result = aggregatePushResults(
    { ok: false, sent: 0, failed: 1, deactivated: 1 },
    { ok: true, sent: 2, failed: 0, invalid: 0 }
  )

  assert.equal(result.ok, true)
  assert.equal(result.sent, 2)
  assert.equal(result.failed, 1)
  assert.equal(result.deactivated, 1)
  assert.deepEqual(result.channels.expo, { ok: true, sent: 2, failed: 0 })
})
