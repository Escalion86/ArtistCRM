import NetInfo from '@react-native-community/netinfo'
import { api } from '../api/client'
import {
  applyTombstones,
  getSyncCursor,
  removeCachedEntity,
  setSyncCursor,
  upsertEntities,
} from '../storage/cache'
import { getDatabase } from '../storage/database'
import { syncFileQueue } from '../storage/encryptedFiles'
import {
  getOutboxSummary,
  listPendingOperations,
  replacePendingEntityId,
  replacePendingLocalReferences,
  updateOperationStatus,
} from '../storage/outbox'
import {
  classifySyncError,
  markSyncCompleted,
  markSyncFailed,
  markSyncOffline,
  markSyncStarted,
} from './syncState'

type PushResult = {
  operationId: string
  status: 'applied' | 'conflict' | 'failed'
  entityType?: string
  entityId?: string
  localEntityId?: string
  entity?: Record<string, unknown> | null
  remoteVersion?: number
  conflicts?: Array<{
    path: string
    base: unknown
    local: unknown
    remote: unknown
  }>
  error?: { code?: string; message?: string }
}

type PullPayload = {
  cursor: string
  hasMore?: boolean
  entities: Record<string, Array<Record<string, unknown> & { _id: string }>>
  tombstones: Array<{ entityType: string; entityId: string; deletedAt: string }>
}

let activeSync: ReturnType<typeof getOutboxSummary> | null = null
let activeSyncIsFullPull = false

type SyncOptions = {
  fullPull?: boolean
}

const saveConflicts = async (result: PushResult) => {
  const database = await getDatabase()
  for (const conflict of result.conflicts || []) {
    await database.runAsync(
      `INSERT OR REPLACE INTO sync_conflicts (
        id, operation_id, entity_type, entity_id, path, base_value,
        local_value, remote_value, remote_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `${result.operationId}:${conflict.path}`,
      result.operationId,
      result.entityType || '',
      result.entityId || result.localEntityId || '',
      conflict.path,
      JSON.stringify(conflict.base),
      JSON.stringify(conflict.local),
      JSON.stringify(conflict.remote),
      String(result.remoteVersion || ''),
      new Date().toISOString()
    )
  }
}

const processPushResult = async (result: PushResult, attempts: number) => {
  if (result.status === 'applied') {
    if (result.entityType && result.entity?._id) {
      if (
        result.localEntityId &&
        String(result.localEntityId) !== String(result.entity._id)
      ) {
        await replacePendingEntityId(
          result.entityType,
          result.localEntityId,
          String(result.entity._id)
        )
        await replacePendingLocalReferences(
          result.localEntityId,
          String(result.entity._id)
        )
        await removeCachedEntity(result.entityType, result.localEntityId)
      }
      await upsertEntities(result.entityType, [
        result.entity as Record<string, unknown> & { _id: string },
      ])
    }
    await updateOperationStatus(result.operationId, 'synced')
    return
  }
  if (result.status === 'conflict') {
    await saveConflicts(result)
    await updateOperationStatus(result.operationId, 'conflict', {
      lastError: 'Требуется разрешить конфликт',
    })
    return
  }

  const nextAttempts = attempts + 1
  const retryMs = Math.min(60 * 60 * 1000, 30 * 1000 * 2 ** nextAttempts)
  await updateOperationStatus(result.operationId, 'failed', {
    attempts: nextAttempts,
    nextRetryAt: new Date(Date.now() + retryMs).toISOString(),
    lastError: result.error?.message || 'Ошибка синхронизации',
  })
}

const pushOutbox = async () => {
  for (let processed = 0; processed < 50; processed += 1) {
    const [operation] = await listPendingOperations(1)
    if (!operation) return
    await updateOperationStatus(operation.operationId, 'syncing', {
      attempts: operation.attempts,
    })
    try {
      const response = await api.post<{
        success: true
        data: { results: PushResult[] }
      }>('/mobile/v1/sync/push', { operations: [operation] })
      const result = response.data.results[0]
      if (result) await processPushResult(result, operation.attempts)
      else throw new Error('Сервер не вернул результат синхронизации')
    } catch (error) {
      const nextAttempts = operation.attempts + 1
      await updateOperationStatus(operation.operationId, 'failed', {
        attempts: nextAttempts,
        nextRetryAt: new Date(
          Date.now() + Math.min(60 * 60 * 1000, 30 * 1000 * 2 ** nextAttempts)
        ).toISOString(),
        lastError: error instanceof Error ? error.message : 'Нет соединения',
      })
      return
    }
  }
}

const pullChanges = async (fullPull = false) => {
  let cursor = fullPull ? '' : await getSyncCursor()
  const tombstones: PullPayload['tombstones'] = []
  for (let page = 0; page < 100; page += 1) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const response = await api.get<{ success: true; data: PullPayload }>(
      `/mobile/v1/sync/pull${query}`
    )
    for (const [entityType, entities] of Object.entries(
      response.data.entities
    )) {
      await upsertEntities(entityType, entities)
    }
    tombstones.push(...response.data.tombstones)
    cursor = response.data.cursor
    if (!response.data.hasMore) {
      await applyTombstones(tombstones)
      await setSyncCursor(cursor)
      return
    }
  }
  throw new Error('Превышен лимит страниц синхронизации')
}

export const runSync = (
  { fullPull = false }: SyncOptions = {}
): ReturnType<typeof getOutboxSummary> => {
  if (activeSync) {
    if (fullPull && !activeSyncIsFullPull) {
      return activeSync.then(() => runSync({ fullPull: true }))
    }
    return activeSync
  }
  activeSyncIsFullPull = fullPull
  activeSync = (async () => {
    await markSyncStarted()
    try {
      const network = await NetInfo.fetch()
      if (!network.isConnected) {
        await markSyncOffline()
        return getOutboxSummary()
      }
      await pushOutbox()
      await syncFileQueue()
      await pullChanges(fullPull)
      const summary = await getOutboxSummary()
      await markSyncCompleted()
      return summary
    } catch (error) {
      await markSyncFailed(classifySyncError(error)).catch(() => undefined)
      throw error
    }
  })().finally(() => {
    activeSync = null
    activeSyncIsFullPull = false
  })
  return activeSync
}
