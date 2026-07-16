import { getDatabase } from './database'

export type CachedEntity<T extends object> = T & {
  _id: string
  syncVersion?: number
  updatedAt?: string
}

export const upsertEntities = async <T extends object>(
  entityType: string,
  entities: Array<CachedEntity<T>>
) => {
  if (entities.length === 0) return
  const database = await getDatabase()
  await database.withTransactionAsync(async () => {
    for (const entity of entities) {
      await database.runAsync(
        `INSERT INTO entity_cache (
          entity_type, entity_id, payload, version, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, NULL)
        ON CONFLICT(entity_type, entity_id) DO UPDATE SET
          payload = excluded.payload,
          version = excluded.version,
          updated_at = excluded.updated_at,
          deleted_at = NULL`,
        entityType,
        String(entity._id),
        JSON.stringify(entity),
        String(entity.syncVersion || 1),
        entity.updatedAt || new Date().toISOString()
      )
    }
  })
}

export const listCachedEntities = async <T extends object>(
  entityType: string
) => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<{ payload: string }>(
    `SELECT payload FROM entity_cache
     WHERE entity_type = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    entityType
  )
  return rows.map((row) => JSON.parse(row.payload) as CachedEntity<T>)
}

export const getCachedEntity = async <T extends object>(
  entityType: string,
  entityId: string
) => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM entity_cache
     WHERE entity_type = ? AND entity_id = ? AND deleted_at IS NULL`,
    entityType,
    entityId
  )
  return row ? (JSON.parse(row.payload) as CachedEntity<T>) : null
}

export const removeCachedEntity = async (entityType: string, entityId: string) => {
  const database = await getDatabase()
  await database.runAsync(
    'DELETE FROM entity_cache WHERE entity_type = ? AND entity_id = ?',
    entityType,
    entityId
  )
}

export const applyTombstones = async (
  tombstones: Array<{ entityType: string; entityId: string; deletedAt: string }>
) => {
  if (tombstones.length === 0) return
  const database = await getDatabase()
  await database.withTransactionAsync(async () => {
    for (const tombstone of tombstones) {
      await database.runAsync(
        'DELETE FROM entity_cache WHERE entity_type = ? AND entity_id = ?',
        tombstone.entityType,
        tombstone.entityId
      )
    }
  })
}

export const getSyncCursor = async (scope = 'default') => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<{ cursor: string }>(
    'SELECT cursor FROM sync_cursors WHERE scope = ?',
    scope
  )
  return row?.cursor || ''
}

export const setSyncCursor = async (cursor: string, scope = 'default') => {
  const database = await getDatabase()
  await database.runAsync(
    `INSERT INTO sync_cursors (scope, cursor, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(scope) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at`,
    scope,
    cursor,
    new Date().toISOString()
  )
}
