import * as Crypto from 'expo-crypto'
import { applyConflictChoiceToPatch } from '../domain/conflictResolution'
import { getCachedEntity, upsertEntities } from './cache'
import { getDatabase } from './database'
import { runSync } from '../sync/syncEngine'
import { refreshSyncStateFromQueue } from '../sync/syncState'

export type SyncConflict = {
  id: string
  operationId: string
  entityType: string
  entityId: string
  path: string
  base: unknown
  local: unknown
  remote: unknown
  remoteVersion: string
  createdAt: string
}

const parse = (value: unknown) => {
  try {
    return JSON.parse(String(value ?? 'null')) as unknown
  } catch {
    return value
  }
}

export const listConflicts = async () => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sync_conflicts ORDER BY created_at DESC'
  )
  return rows.map(
    (row): SyncConflict => ({
      id: String(row.id),
      operationId: String(row.operation_id),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      path: String(row.path),
      base: parse(row.base_value),
      local: parse(row.local_value),
      remote: parse(row.remote_value),
      remoteVersion: String(row.remote_version || ''),
      createdAt: String(row.created_at),
    })
  )
}

export const resolveConflict = async (
  conflict: SyncConflict,
  choice: 'local' | 'remote'
) => {
  const database = await getDatabase()
  let resolution = { payload: {}, baseValues: {} } as {
    payload: Record<string, unknown>
    baseValues: Record<string, unknown>
  }
  let handled = false
  let completed = false
  let retryOperationId = ''
  const now = new Date().toISOString()

  await database.withTransactionAsync(async () => {
    const claimed = await database.runAsync(
      'DELETE FROM sync_conflicts WHERE id = ?',
      conflict.id
    )
    if (!claimed.changes) return
    handled = true

    const operation = await database.getFirstAsync<{
      payload: string
      base_values: string | null
      attachments: string | null
    }>(
      `SELECT payload, base_values, attachments FROM outbox
       WHERE operation_id = ?`,
      conflict.operationId
    )
    resolution = applyConflictChoiceToPatch({
      payload: operation ? JSON.parse(operation.payload || '{}') : {},
      baseValues: operation?.base_values
        ? JSON.parse(operation.base_values)
        : {},
      path: conflict.path,
      local: conflict.local,
      remote: conflict.remote,
      choice,
    })
    if (operation) {
      await database.runAsync(
        `UPDATE outbox SET payload = ?, base_values = ?, updated_at = ?
         WHERE operation_id = ?`,
        JSON.stringify(resolution.payload),
        JSON.stringify(resolution.baseValues),
        now,
        conflict.operationId
      )
    }
    const remaining = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_conflicts WHERE operation_id = ?',
      conflict.operationId
    )
    completed = !remaining?.count
    if (!completed) return

    await database.runAsync(
      `UPDATE outbox SET status = 'synced', next_retry_at = NULL,
       last_error = NULL, updated_at = ? WHERE operation_id = ?`,
      now,
      conflict.operationId
    )
    if (!operation || Object.keys(resolution.payload).length === 0) return

    retryOperationId = Crypto.randomUUID()
    await database.runAsync(
      `INSERT INTO outbox (
        operation_id, entity_type, entity_id, method, payload, base_version,
        base_values, attachments, status, attempts, created_at, updated_at
      ) VALUES (?, ?, ?, 'update', ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      retryOperationId,
      conflict.entityType,
      conflict.entityId,
      JSON.stringify(resolution.payload),
      conflict.remoteVersion || null,
      JSON.stringify(resolution.baseValues),
      operation.attachments || '[]',
      now,
      now
    )
  })

  if (!handled || !completed) return
  const entity = await getCachedEntity<Record<string, unknown>>(
    conflict.entityType,
    conflict.entityId
  )
  if (entity) {
    await upsertEntities(conflict.entityType, [
      {
        ...entity,
        ...resolution.payload,
        syncVersion: Number(conflict.remoteVersion || entity.syncVersion || 1),
        syncStatus: retryOperationId ? 'pending' : 'synced',
      },
    ])
  }
  await refreshSyncStateFromQueue()
  if (retryOperationId) runSync().catch(() => undefined)
}
