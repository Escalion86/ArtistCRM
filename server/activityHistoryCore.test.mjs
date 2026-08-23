import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHistoryChanges, getHistoryEntityLabel, getTaskSemanticAction } from './activityHistoryCore.mjs'

test('history diff includes allowed fields and excludes secrets and technical fields', () => {
  const changes = buildHistoryChanges({
    entityType: 'client',
    operation: 'update',
    before: { firstName: 'Анна', password: 'old', syncVersion: 1 },
    after: { firstName: 'Мария', password: 'new', syncVersion: 2 },
  })
  assert.deepEqual(changes, [{ field: 'firstName', label: 'Имя', oldValue: 'Анна', newValue: 'Мария' }])
})

test('history recognizes completed task', () => {
  const changes = buildHistoryChanges({
    entityType: 'event', operation: 'update',
    before: { additionalEvents: [{ title: 'Позвонить', done: false, googleCalendarEventId: 'old-private-id' }] },
    after: { additionalEvents: [{ title: 'Позвонить', done: true, googleCalendarEventId: 'new-private-id' }] },
  })
  assert.equal(getTaskSemanticAction(changes), 'task_completed')
  assert.equal(JSON.stringify(changes).includes('private-id'), false)
})

test('entity labels are human readable', () => {
  assert.equal(getHistoryEntityLabel('client', { firstName: 'Анна', secondName: 'Иванова' }), 'Анна Иванова')
  assert.equal(getHistoryEntityLabel('event', { status: 'draft', eventType: 'Свадьба' }), 'Заявка: Свадьба')
})
