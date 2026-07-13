import test from 'node:test'
import assert from 'node:assert/strict'
import { writeHistorySafely } from './historyAuditCore.mjs'

test('failed delete history is swallowed and logged without payload', async () => {
  const deletedEvent = { _id: 'event-id', status: 'draft' }
  const logCalls = []

  const result = await writeHistorySafely({
    create: async () => {
      const error = new Error('payload must not be logged')
      error.code = 10334
      throw error
    },
    entry: {
      schema: 'events',
      action: 'delete',
      data: [deletedEvent],
    },
    context: 'events.delete',
    logError: (...args) => logCalls.push(args),
  })

  assert.equal(result, null)
  assert.equal(logCalls.length, 1)
  assert.deepEqual(logCalls[0][1], {
    context: 'events.delete',
    schema: 'events',
    action: 'delete',
    error: { name: 'Error', code: 10334 },
  })
  assert.equal(
    JSON.stringify(logCalls).includes('payload must not be logged'),
    false
  )
  assert.deepEqual(deletedEvent, { _id: 'event-id', status: 'draft' })
})
