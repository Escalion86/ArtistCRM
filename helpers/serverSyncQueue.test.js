import test from 'node:test'
import assert from 'node:assert/strict'

import {
  appendServerSyncQueueItem,
  createServerSyncQueueItem,
  getReadyServerSyncQueueItems,
  getServerSyncQueueSummary,
  markServerSyncQueueItemFailed,
  markServerSyncQueueItemSyncing,
  removeSyncedServerSyncQueueItems,
  updateServerSyncQueueItem,
} from './serverSyncQueue.js'

test('queue refuses a write when storage fails or the pending queue is full', () => {
  const previousWindow = globalThis.window
  let stored = '[]'
  globalThis.window = {
    localStorage: {
      getItem: () => stored,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    },
    dispatchEvent: () => {},
  }
  try {
    assert.throws(
      () => appendServerSyncQueueItem({ id: 'new' }),
      /QuotaExceededError/
    )
    stored = JSON.stringify([{ id: 'existing', status: 'pending' }])
    assert.throws(
      () => updateServerSyncQueueItem('existing', markServerSyncQueueItemSyncing),
      /QuotaExceededError/
    )
    assert.equal(JSON.parse(stored)[0].status, 'pending')
    stored = '{broken'
    assert.throws(() => appendServerSyncQueueItem({ id: 'new' }), SyntaxError)
    assert.equal(stored, '{broken')
    stored = JSON.stringify(
      Array.from({ length: 500 }, (_, index) => ({
        id: `old-${index}`,
        status: 'pending',
      }))
    )
    globalThis.window.localStorage.setItem = (_, value) => {
      stored = value
    }
    assert.throws(
      () => appendServerSyncQueueItem({ id: 'new' }),
      /SERVER_SYNC_QUEUE_FULL/
    )
    assert.equal(JSON.parse(stored).length, 500)
    assert.equal(JSON.parse(stored)[0].id, 'old-0')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

test('createServerSyncQueueItem adds sync metadata to queued write', () => {
  const item = createServerSyncQueueItem(
    {
      id: 'queue-1',
      url: '/api/events',
      method: 'POST',
      body: '{"title":"Lead"}',
      headers: { 'Content-Type': 'application/json' },
    },
    '2026-06-22T10:00:00.000Z'
  )

  assert.equal(item.status, 'pending')
  assert.equal(item.attempts, 0)
  assert.equal(item.createdAt, '2026-06-22T10:00:00.000Z')
  assert.equal(item.updatedAt, '2026-06-22T10:00:00.000Z')
  assert.equal(item.nextRetryAt, null)
  assert.equal(item.lastError, '')
})

test('getServerSyncQueueSummary counts statuses and ready items', () => {
  const queue = [
    { id: 'pending', status: 'pending' },
    {
      id: 'failed-ready',
      status: 'failed',
      nextRetryAt: '2026-06-22T09:59:00.000Z',
    },
    {
      id: 'failed-waiting',
      status: 'failed',
      nextRetryAt: '2026-06-22T10:01:00.000Z',
    },
    { id: 'conflict', status: 'conflict' },
    { id: 'syncing', status: 'syncing' },
  ]

  const summary = getServerSyncQueueSummary(queue, '2026-06-22T10:00:00.000Z')

  assert.equal(summary.total, 5)
  assert.equal(summary.pending, 1)
  assert.equal(summary.failed, 2)
  assert.equal(summary.conflict, 1)
  assert.equal(summary.syncing, 1)
  assert.equal(summary.ready, 2)
  assert.equal(summary.waitingRetry, 1)
})

test('markServerSyncQueueItemFailed increments attempts and schedules backoff', () => {
  const firstFailure = markServerSyncQueueItemFailed(
    { id: 'queue-1', attempts: 0 },
    'NetworkError',
    '2026-06-22T10:00:00.000Z'
  )
  const secondFailure = markServerSyncQueueItemFailed(
    firstFailure,
    'NetworkError again',
    '2026-06-22T10:00:05.000Z'
  )

  assert.equal(firstFailure.status, 'failed')
  assert.equal(firstFailure.attempts, 1)
  assert.equal(firstFailure.lastError, 'NetworkError')
  assert.equal(firstFailure.nextRetryAt, '2026-06-22T10:00:05.000Z')
  assert.equal(secondFailure.attempts, 2)
  assert.equal(secondFailure.nextRetryAt, '2026-06-22T10:00:35.000Z')
})

test('getReadyServerSyncQueueItems excludes conflicts and failed items before retry time', () => {
  const queue = [
    { id: 'pending', status: 'pending' },
    {
      id: 'failed-waiting',
      status: 'failed',
      nextRetryAt: '2026-06-22T10:01:00.000Z',
    },
    {
      id: 'failed-ready',
      status: 'failed',
      nextRetryAt: '2026-06-22T09:59:00.000Z',
    },
    { id: 'conflict', status: 'conflict' },
  ]

  const ready = getReadyServerSyncQueueItems(queue, '2026-06-22T10:00:00.000Z')

  assert.deepEqual(
    ready.map((item) => item.id),
    ['pending', 'failed-ready']
  )
})

test('removeSyncedServerSyncQueueItems drops synced writes and resets stale syncing writes', () => {
  const queue = [
    { id: 'synced', status: 'synced' },
    { id: 'syncing', status: 'syncing', attempts: 1 },
    { id: 'pending', status: 'pending' },
  ]

  const cleaned = removeSyncedServerSyncQueueItems(
    queue,
    '2026-06-22T10:00:00.000Z'
  )

  assert.deepEqual(
    cleaned.map((item) => item.id),
    ['syncing', 'pending']
  )
  assert.equal(cleaned[0].status, 'pending')
  assert.equal(cleaned[0].updatedAt, '2026-06-22T10:00:00.000Z')
})

test('markServerSyncQueueItemSyncing updates only transient status metadata', () => {
  const item = markServerSyncQueueItemSyncing(
    { id: 'queue-1', status: 'failed', attempts: 2 },
    '2026-06-22T10:00:00.000Z'
  )

  assert.equal(item.status, 'syncing')
  assert.equal(item.attempts, 2)
  assert.equal(item.updatedAt, '2026-06-22T10:00:00.000Z')
})
