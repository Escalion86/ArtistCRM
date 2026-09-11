export const SERVER_SYNC_QUEUE_KEY = 'artistcrm:server-sync-queue'
export const SERVER_SYNC_QUEUE_CHANGED_EVENT = 'artistcrm:server-sync-queue-changed'
export const SERVER_SYNC_FLUSH_NOW_EVENT = 'artistcrm:server-sync-flush-now'
const MAX_QUEUE_SIZE = 500
const QUEUE_STATUSES = new Set([
  'pending',
  'syncing',
  'failed',
  'conflict',
  'synced',
])
const RETRY_BACKOFF_MS = [5000, 30000, 120000, 600000]

const toIsoString = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

const toTime = (value) => {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const normalizeStatus = (status) =>
  QUEUE_STATUSES.has(status) ? status : 'pending'

const getBackoffMs = (attempts) => {
  const index = Math.max(0, Number(attempts || 1) - 1)
  return RETRY_BACKOFF_MS[Math.min(index, RETRY_BACKOFF_MS.length - 1)]
}

const isReadyToSync = (item, now) => {
  const status = normalizeStatus(item?.status)
  if (status === 'pending') return true
  if (status !== 'failed') return false
  const retryAt = item?.nextRetryAt ? toTime(item.nextRetryAt) : 0
  return retryAt === 0 || retryAt <= toTime(now)
}

export const createServerSyncQueueItem = (item, now = new Date()) => {
  const timestamp = toIsoString(now)
  return {
    ...item,
    method: String(item?.method || 'POST').toUpperCase(),
    status: normalizeStatus(item?.status),
    attempts: Number.isFinite(Number(item?.attempts))
      ? Number(item.attempts)
      : 0,
    createdAt: item?.createdAt || timestamp,
    updatedAt: timestamp,
    nextRetryAt: item?.nextRetryAt ?? null,
    lastError: item?.lastError || '',
  }
}

export const markServerSyncQueueItemSyncing = (item, now = new Date()) => ({
  ...createServerSyncQueueItem(item, now),
  status: 'syncing',
  updatedAt: toIsoString(now),
})

export const markServerSyncQueueItemFailed = (
  item,
  error,
  now = new Date()
) => {
  const timestamp = toIsoString(now)
  const attempts = Number(item?.attempts || 0) + 1
  const retryAt = new Date(toTime(timestamp) + getBackoffMs(attempts))

  return {
    ...createServerSyncQueueItem(item, timestamp),
    status: 'failed',
    attempts,
    updatedAt: timestamp,
    nextRetryAt: retryAt.toISOString(),
    lastError:
      typeof error === 'string'
        ? error
        : error?.message
          ? String(error.message)
          : 'sync_failed',
  }
}

export const markServerSyncQueueItemConflict = (
  item,
  error,
  now = new Date()
) => ({
  ...createServerSyncQueueItem(item, now),
  status: 'conflict',
  updatedAt: toIsoString(now),
  nextRetryAt: null,
  lastError:
    typeof error === 'string'
      ? error
      : error?.message
        ? String(error.message)
        : 'sync_conflict',
})

export const markServerSyncQueueItemSynced = (item, now = new Date()) => ({
  ...createServerSyncQueueItem(item, now),
  status: 'synced',
  updatedAt: toIsoString(now),
  nextRetryAt: null,
  lastError: '',
})

export const getReadyServerSyncQueueItems = (queue = [], now = new Date()) =>
  (Array.isArray(queue) ? queue : []).filter((item) => isReadyToSync(item, now))

export const removeSyncedServerSyncQueueItems = (
  queue = [],
  now = new Date()
) =>
  (Array.isArray(queue) ? queue : [])
    .filter((item) => normalizeStatus(item?.status) !== 'synced')
    .map((item) =>
      normalizeStatus(item?.status) === 'syncing'
        ? {
            ...createServerSyncQueueItem(item, now),
            status: 'pending',
            updatedAt: toIsoString(now),
          }
        : item
    )

export const getServerSyncQueueSummary = (queue = [], now = new Date()) => {
  const summary = {
    total: 0,
    pending: 0,
    syncing: 0,
    failed: 0,
    conflict: 0,
    synced: 0,
    ready: 0,
    waitingRetry: 0,
  }

  ;(Array.isArray(queue) ? queue : []).forEach((item) => {
    const status = normalizeStatus(item?.status)
    summary.total += 1
    summary[status] += 1
    if (isReadyToSync(item, now)) summary.ready += 1
    if (
      status === 'failed' &&
      item?.nextRetryAt &&
      toTime(item.nextRetryAt) > toTime(now)
    ) {
      summary.waitingRetry += 1
    }
  })

  return summary
}

const safeParse = (value) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const emitQueueChanged = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SERVER_SYNC_QUEUE_CHANGED_EVENT))
}

export const readServerSyncQueue = () => {
  if (typeof window === 'undefined') return []
  try {
    return safeParse(window.localStorage.getItem(SERVER_SYNC_QUEUE_KEY))
  } catch (error) {
    return []
  }
}

export const getServerSyncQueueCount = () => readServerSyncQueue().length

export const appendServerSyncQueueItem = (item) => {
  if (typeof window === 'undefined' || !item) return
  // Ошибку чтения/записи нельзя превращать в успешное «сохранено локально».
  const raw = window.localStorage.getItem(SERVER_SYNC_QUEUE_KEY)
  const queue = raw ? JSON.parse(raw) : []
  if (!Array.isArray(queue)) throw new Error('SERVER_SYNC_QUEUE_INVALID')
  const pending = queue.filter((entry) => entry?.status !== 'synced')
  if (pending.length >= MAX_QUEUE_SIZE) throw new Error('SERVER_SYNC_QUEUE_FULL')
  const nextQueue = [...pending, createServerSyncQueueItem(item)]
  window.localStorage.setItem(SERVER_SYNC_QUEUE_KEY, JSON.stringify(nextQueue))
  emitQueueChanged()
}

export const clearServerSyncQueue = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SERVER_SYNC_QUEUE_KEY)
    emitQueueChanged()
  } catch (error) {
    // no-op
  }
}

const saveServerSyncQueue = (queue) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SERVER_SYNC_QUEUE_KEY, JSON.stringify(queue))
  emitQueueChanged()
}

export const shiftServerSyncQueue = (count = 1) => {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(count) || count <= 0) return
  const queue = readServerSyncQueue()
  if (queue.length === 0) return
  saveServerSyncQueue(queue.slice(count))
}

export const replaceServerSyncQueue = (queue = []) => {
  if (!Array.isArray(queue)) return
  saveServerSyncQueue(removeSyncedServerSyncQueueItems(queue))
}

export const updateServerSyncQueueItem = (id, updater) => {
  if (!id || typeof updater !== 'function') return
  const queue = readServerSyncQueue()
  const nextQueue = queue.map((item) =>
    String(item?.id) === String(id) ? updater(item) : item
  )
  saveServerSyncQueue(nextQueue)
}
