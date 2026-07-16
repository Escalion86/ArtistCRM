import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyExistingSyncOperation,
  getSyncOperationFingerprint,
  getSyncOperationScope,
  validateSyncOperation,
} from './syncOperations.js'

const operation = {
  operationId: 'op-1', entityType: 'events', entityId: 'event-1', method: 'update',
  payload: { status: 'closed', description: 'Готово' }, baseVersion: '2',
  baseValues: { status: 'active', description: 'Было' }, attachments: [],
}

test('отпечаток операции не зависит от порядка ключей', () => {
  const reordered = {
    ...operation,
    payload: { description: 'Готово', status: 'closed' },
    baseValues: { description: 'Было', status: 'active' },
  }
  assert.equal(getSyncOperationFingerprint(operation), getSyncOperationFingerprint(reordered))
})

test('отпечаток меняется при повторном использовании operationId с другим payload', () => {
  assert.notEqual(
    getSyncOperationFingerprint(operation),
    getSyncOperationFingerprint({ ...operation, payload: { status: 'canceled' } })
  )
})

test('scope идемпотентности всегда включает tenant', () => {
  assert.deepEqual(getSyncOperationScope('tenant-a', 'op-1'), {
    tenantId: 'tenant-a', operationId: 'op-1',
  })
  assert.notDeepEqual(
    getSyncOperationScope('tenant-a', 'op-1'),
    getSyncOperationScope('tenant-b', 'op-1')
  )
})

test('валидатор принимает корректную операцию и отклоняет опасные формы', () => {
  assert.equal(validateSyncOperation(operation), null)
  assert.equal(validateSyncOperation({ ...operation, entityId: '' })?.code, 'ENTITY_ID_INVALID')
  assert.equal(validateSyncOperation({ ...operation, method: 'patch' })?.code, 'OPERATION_METHOD_INVALID')
  assert.equal(validateSyncOperation({ ...operation, payload: [] })?.code, 'OPERATION_PAYLOAD_INVALID')
  assert.equal(
    validateSyncOperation({ ...operation, attachments: Array(21).fill({}) })?.code,
    'OPERATION_ATTACHMENTS_INVALID'
  )
})

test('существующий результат переигрывается только для того же отпечатка', () => {
  const fingerprint = getSyncOperationFingerprint(operation)
  const response = { operationId: 'op-1', status: 'applied' }
  assert.deepEqual(classifyExistingSyncOperation({
    existing: { operationHash: fingerprint, response }, fingerprint,
  }), { state: 'replay', response })
  assert.deepEqual(classifyExistingSyncOperation({
    existing: { operationHash: 'other', response }, fingerprint,
  }), { state: 'reused' })
})

test('свежая операция processing не выполняется второй раз, зависшая резервация может быть перехвачена', () => {
  const fingerprint = getSyncOperationFingerprint(operation)
  const now = new Date('2026-07-15T12:10:00.000Z')
  assert.deepEqual(classifyExistingSyncOperation({
    existing: {
      operationHash: fingerprint, status: 'processing',
      phase: 'reserved',
      updatedAt: new Date('2026-07-15T12:09:30.000Z'),
    }, fingerprint, now,
  }), { state: 'processing' })
  assert.deepEqual(classifyExistingSyncOperation({
    existing: {
      operationHash: fingerprint, status: 'processing',
      phase: 'reserved',
      updatedAt: new Date('2026-07-15T12:00:00.000Z'),
    }, fingerprint, now,
  }), { state: 'reclaim' })
})

test('зависшая операция после начала CRUD не выполняется повторно', () => {
  const fingerprint = getSyncOperationFingerprint(operation)
  assert.deepEqual(classifyExistingSyncOperation({
    existing: {
      operationHash: fingerprint,
      status: 'processing',
      phase: 'applying',
      updatedAt: new Date('2026-07-15T12:00:00.000Z'),
    },
    fingerprint,
    now: new Date('2026-07-15T12:10:00.000Z'),
  }), { state: 'unknown' })
})
