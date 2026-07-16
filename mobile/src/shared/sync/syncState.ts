import { getDatabase } from '../storage/database'

export type SyncRunStatus =
  | 'never'
  | 'pending'
  | 'syncing'
  | 'success'
  | 'attention'
  | 'offline'
  | 'failed'
  | 'interrupted'

export type SyncErrorCode =
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'server'
  | 'interrupted'
  | 'unknown'

export type SyncRunState = {
  status: SyncRunStatus
  lastAttemptAt?: string | null
  lastCompletedAt?: string | null
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  lastErrorCode?: SyncErrorCode | null
  issueCount: number
  consecutiveFailures: number
}

type SyncStateRow = {
  status?: string
  last_attempt_at?: string | null
  last_completed_at?: string | null
  last_success_at?: string | null
  last_failure_at?: string | null
  last_error_code?: string | null
  issue_count?: number
  consecutive_failures?: number
}

const listeners = new Set<(state: SyncRunState) => void>()

const emptyState = (): SyncRunState => ({
  status: 'never',
  lastAttemptAt: null,
  lastCompletedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastErrorCode: null,
  issueCount: 0,
  consecutiveFailures: 0,
})

const mapSyncState = (row?: SyncStateRow | null): SyncRunState => {
  if (!row) return emptyState()
  const allowedStatuses: SyncRunStatus[] = [
    'never',
    'pending',
    'syncing',
    'success',
    'attention',
    'offline',
    'failed',
    'interrupted',
  ]
  const status = allowedStatuses.includes(row.status as SyncRunStatus)
    ? (row.status as SyncRunStatus)
    : 'never'
  return {
    status,
    lastAttemptAt: row.last_attempt_at || null,
    lastCompletedAt: row.last_completed_at || null,
    lastSuccessAt: row.last_success_at || null,
    lastFailureAt: row.last_failure_at || null,
    lastErrorCode: (row.last_error_code as SyncErrorCode) || null,
    issueCount: Number(row.issue_count || 0),
    consecutiveFailures: Number(row.consecutive_failures || 0),
  }
}

export const getSyncRunState = async () => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<SyncStateRow>(
    "SELECT * FROM sync_state WHERE scope = 'global'"
  )
  return mapSyncState(row)
}

const notifyStateChanged = async () => {
  if (!listeners.size) return
  const state = await getSyncRunState()
  for (const listener of listeners) listener(state)
}

export const subscribeSyncRunState = (
  listener: (state: SyncRunState) => void
) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const markSyncStarted = async () => {
  const database = await getDatabase()
  const now = new Date().toISOString()
  await database.runAsync(
    `INSERT INTO sync_state (
      scope, status, last_attempt_at, issue_count,
      consecutive_failures, updated_at
    ) VALUES ('global', 'syncing', ?, 0, 0, ?)
    ON CONFLICT(scope) DO UPDATE SET
      status = 'syncing', last_attempt_at = excluded.last_attempt_at,
      updated_at = excluded.updated_at`,
    now,
    now
  )
  await notifyStateChanged()
}

export const markSyncPending = async () => {
  const database = await getDatabase()
  const now = new Date().toISOString()
  await database.runAsync(
    `INSERT INTO sync_state (
      scope, status, issue_count, consecutive_failures, updated_at
    ) VALUES ('global', 'pending', 0, 0, ?)
    ON CONFLICT(scope) DO UPDATE SET
      status = CASE
        WHEN sync_state.status = 'syncing' THEN 'syncing'
        ELSE 'pending'
      END,
      updated_at = excluded.updated_at`,
    now
  )
  await notifyStateChanged()
}

export const markSyncOffline = async () => {
  const database = await getDatabase()
  const now = new Date().toISOString()
  await database.runAsync(
    `UPDATE sync_state SET status = 'offline', last_error_code = 'network',
      updated_at = ? WHERE scope = 'global'`,
    now
  )
  await notifyStateChanged()
}

export const markSyncCompleted = async () => {
  const database = await getDatabase()
  const now = new Date().toISOString()
  await database.runAsync(
    `WITH queue_counts AS (
      SELECT
        (SELECT COUNT(*) FROM outbox
          WHERE status IN ('failed', 'conflict')) +
        (SELECT COUNT(*) FROM file_queue
          WHERE status = 'failed') AS issues,
        (SELECT COUNT(*) FROM outbox
          WHERE status IN ('pending', 'syncing')) +
        (SELECT COUNT(*) FROM file_queue
          WHERE status IN ('pending', 'uploading')) AS pending
    )
    UPDATE sync_state SET
      status = (SELECT CASE
        WHEN issues > 0 THEN 'attention'
        WHEN pending > 0 THEN 'pending'
        ELSE 'success'
      END FROM queue_counts),
      last_completed_at = ?,
      last_success_at = (SELECT CASE
        WHEN issues = 0 AND pending = 0 THEN ?
        ELSE sync_state.last_success_at
      END FROM queue_counts),
      last_error_code = NULL,
      issue_count = (SELECT issues FROM queue_counts),
      consecutive_failures = 0,
      updated_at = ?
    WHERE scope = 'global'`,
    now,
    now,
    now
  )
  await notifyStateChanged()
}

export const markSyncFailed = async (errorCode: SyncErrorCode) => {
  const database = await getDatabase()
  const now = new Date().toISOString()
  await database.runAsync(
    `UPDATE sync_state SET status = 'failed', last_failure_at = ?,
      last_error_code = ?, consecutive_failures = consecutive_failures + 1,
      updated_at = ? WHERE scope = 'global'`,
    now,
    errorCode,
    now
  )
  await notifyStateChanged()
}

export const getSyncQueueCounts = async () => {
  const database = await getDatabase()
  const [outbox, files] = await Promise.all([
    database.getFirstAsync<{ issues?: number; pending?: number }>(
      `SELECT
        SUM(CASE WHEN status IN ('failed', 'conflict') THEN 1 ELSE 0 END) AS issues,
        SUM(CASE WHEN status IN ('pending', 'syncing') THEN 1 ELSE 0 END) AS pending
       FROM outbox`
    ),
    database.getFirstAsync<{ issues?: number; pending?: number }>(
      `SELECT
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS issues,
        SUM(CASE WHEN status IN ('pending', 'uploading') THEN 1 ELSE 0 END) AS pending
       FROM file_queue`
    ),
  ])
  return {
    issueCount: Number(outbox?.issues || 0) + Number(files?.issues || 0),
    pendingCount: Number(outbox?.pending || 0) + Number(files?.pending || 0),
  }
}

export const refreshSyncStateFromQueue = async () => {
  const counts = await getSyncQueueCounts()
  const database = await getDatabase()
  const now = new Date().toISOString()
  if (counts.issueCount > 0) {
    await database.runAsync(
      `INSERT INTO sync_state (
        scope, status, issue_count, consecutive_failures, updated_at
      ) VALUES ('global', 'attention', ?, 0, ?)
      ON CONFLICT(scope) DO UPDATE SET
        status = CASE
          WHEN sync_state.status = 'syncing' THEN 'syncing'
          ELSE 'attention'
        END,
        issue_count = excluded.issue_count, updated_at = excluded.updated_at`,
      counts.issueCount,
      now
    )
  } else if (counts.pendingCount > 0) {
    await markSyncPending()
    return counts
  } else {
    await database.runAsync(
      `UPDATE sync_state SET
        status = CASE
          WHEN last_success_at IS NULL THEN 'never'
          ELSE 'success'
        END,
        issue_count = 0, last_error_code = NULL, updated_at = ?
       WHERE scope = 'global' AND status IN ('pending', 'attention')`,
      now
    )
  }
  await notifyStateChanged()
  return counts
}

export const classifySyncError = (error: unknown): SyncErrorCode => {
  const status = Number(
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: unknown }).status
      : 0
  )
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'server'
  const message = error instanceof Error ? error.message : String(error || '')
  if (/network|fetch|internet|offline|соединен|сеть недоступ/i.test(message)) {
    return 'network'
  }
  return 'unknown'
}
