import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findConflictingFields,
  withSyncVersionIncrement,
} from './syncConflict.js'

test('withSyncVersionIncrement сохраняет остальные инкременты и повышает syncVersion на один', () => {
  assert.deepEqual(
    withSyncVersionIncrement({ $set: { title: 'Новое' }, $inc: { counter: 2 } }),
    { $set: { title: 'Новое' }, $inc: { counter: 2, syncVersion: 1 } }
  )
})

test('findConflictingFields не создаёт конфликт для несвязанных изменений', () => {
  const conflicts = findConflictingFields({
    current: { status: 'active', description: 'Изменено на сервере' },
    patch: { status: 'closed' },
    baseValues: { status: 'active' },
  })

  assert.deepEqual(conflicts, [])
})

test('findConflictingFields не создаёт конфликт, если сервер уже содержит локальное значение', () => {
  const conflicts = findConflictingFields({
    current: { status: 'closed' },
    patch: { status: 'closed' },
    baseValues: { status: 'active' },
  })

  assert.deepEqual(conflicts, [])
})

test('findConflictingFields возвращает пересекающееся изменение поля', () => {
  const conflicts = findConflictingFields({
    current: { status: 'canceled' },
    patch: { status: 'closed' },
    baseValues: { status: 'active' },
  })

  assert.deepEqual(conflicts, [{
    path: 'status',
    base: 'active',
    local: 'closed',
    remote: 'canceled',
  }])
})

test('findConflictingFields возвращает конфликт изменённого массива целиком', () => {
  const base = [{ _id: 'task-1', done: false }]
  const local = [{ _id: 'task-1', done: true }]
  const remote = [
    { _id: 'task-1', done: false },
    { _id: 'task-2', done: false },
  ]
  const conflicts = findConflictingFields({
    current: { additionalEvents: remote },
    patch: { additionalEvents: local },
    baseValues: { additionalEvents: base },
  })

  assert.deepEqual(conflicts, [{
    path: 'additionalEvents',
    base,
    local,
    remote,
  }])
})
