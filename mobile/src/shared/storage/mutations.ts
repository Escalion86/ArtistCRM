import * as Crypto from 'expo-crypto'
import { getCachedEntity, removeCachedEntity, upsertEntities } from './cache'
import {
  discardEntityOperations,
  enqueueOperation,
  mergePendingLocalCreate,
} from './outbox'
import { runSync } from '../sync/syncEngine'

export const saveLocalEntity = async <T extends Record<string, unknown>>({
  entityType,
  entityId,
  values,
}: {
  entityType: string
  entityId?: string
  values: T
}) => {
  const existing = entityId
    ? await getCachedEntity<Record<string, unknown>>(entityType, entityId)
    : null
  const localId = entityId || `local-${Crypto.randomUUID()}`
  const now = new Date().toISOString()
  const entity = {
    ...(existing || {}),
    ...values,
    _id: localId,
    updatedAt: now,
    syncStatus: 'pending',
  }
  await upsertEntities(entityType, [entity])
  const mergedLocalCreate =
    existing && localId.startsWith('local-')
      ? await mergePendingLocalCreate(entityType, localId, values)
      : false
  if (!mergedLocalCreate) await enqueueOperation({
    entityType,
    entityId: localId,
    method: existing ? 'update' : 'create',
    payload: values,
    baseVersion: existing?.syncVersion ? String(existing.syncVersion) : null,
    baseValues: existing
      ? Object.fromEntries(Object.keys(values).map((key) => [key, existing[key]]))
      : null,
    attachments: [],
  })
  runSync().catch(() => undefined)
  return entity
}

export const deleteLocalEntity = async (entityType: string, entityId: string) => {
  const existing = await getCachedEntity<Record<string, unknown>>(entityType, entityId)
  await removeCachedEntity(entityType, entityId)
  if (!entityId.startsWith('local-')) {
    await enqueueOperation({
      entityType,
      entityId,
      method: 'delete',
      payload: {},
      baseVersion: existing?.syncVersion ? String(existing.syncVersion) : null,
      baseValues: null,
      attachments: [],
    })
    runSync().catch(() => undefined)
  } else {
    await discardEntityOperations(entityType, entityId)
  }
}
