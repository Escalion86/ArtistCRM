import crypto from 'node:crypto'

export const SYNC_OPERATION_TTL_MS = 90 * 24 * 60 * 60 * 1000
export const SYNC_OPERATION_STALE_MS = 2 * 60 * 1000

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  )
}

export const getSyncOperationFingerprint = (operation) => crypto
  .createHash('sha256')
  .update(JSON.stringify(stableValue({
    entityType: operation?.entityType || '',
    entityId: operation?.entityId || '',
    method: operation?.method || '',
    payload: operation?.payload || {},
    baseVersion: operation?.baseVersion ?? null,
    baseValues: operation?.baseValues ?? null,
    attachments: operation?.attachments || [],
  })))
  .digest('hex')

export const getSyncOperationScope = (tenantId, operationId) => ({
  tenantId,
  operationId,
})

export const validateSyncOperation = (operation) => {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    return { code: 'OPERATION_INVALID', message: 'Операция должна быть объектом' }
  }
  const operationId = String(operation.operationId || '')
  const entityType = String(operation.entityType || '')
  const entityId = String(operation.entityId || '')
  if (!operationId || operationId.length > 128) {
    return { code: 'OPERATION_ID_INVALID', message: 'Некорректный operationId' }
  }
  if (!entityType || entityType.length > 64) {
    return { code: 'ENTITY_TYPE_INVALID', message: 'Некорректный тип данных' }
  }
  if (!entityId || entityId.length > 128) {
    return { code: 'ENTITY_ID_INVALID', message: 'Некорректный ID записи' }
  }
  if (!['create', 'update', 'delete'].includes(operation.method)) {
    return { code: 'OPERATION_METHOD_INVALID', message: 'Некорректный метод операции' }
  }
  if (
    operation.method !== 'delete' &&
    (!operation.payload || typeof operation.payload !== 'object' || Array.isArray(operation.payload))
  ) {
    return { code: 'OPERATION_PAYLOAD_INVALID', message: 'Некорректные данные операции' }
  }
  if (
    operation.baseValues !== undefined &&
    operation.baseValues !== null &&
    (typeof operation.baseValues !== 'object' || Array.isArray(operation.baseValues))
  ) {
    return { code: 'OPERATION_BASE_INVALID', message: 'Некорректные исходные значения' }
  }
  if (
    operation.attachments !== undefined &&
    (!Array.isArray(operation.attachments) || operation.attachments.length > 20)
  ) {
    return { code: 'OPERATION_ATTACHMENTS_INVALID', message: 'Некорректные вложения операции' }
  }
  return null
}

export const classifyExistingSyncOperation = ({ existing, fingerprint, now = new Date() }) => {
  if (!existing) return { state: 'claim' }
  if (existing.operationHash && existing.operationHash !== fingerprint) {
    return { state: 'reused' }
  }
  if (existing.response) return { state: 'replay', response: existing.response }
  const updatedAt = new Date(existing.updatedAt || existing.createdAt || 0).getTime()
  if (
    existing.status === 'processing' &&
    Number.isFinite(updatedAt) &&
    now.getTime() - updatedAt < SYNC_OPERATION_STALE_MS
  ) {
    return { state: 'processing' }
  }
  return existing.phase === 'reserved'
    ? { state: 'reclaim' }
    : { state: 'unknown' }
}
