import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyTaskAction,
  getPostponedDate,
  isTaskAction,
} from './taskActions.js'

test('разрешает только известные быстрые действия', () => {
  assert.equal(isTaskAction('complete'), true)
  assert.equal(isTaskAction('postpone_3'), true)
  assert.equal(isTaskAction('delete'), false)
})

test('переносит просроченную задачу от текущего дня и сохраняет время', () => {
  const now = new Date(2026, 6, 14, 9, 15)
  const result = getPostponedDate(new Date(2026, 5, 1, 17, 30), 1, now)
  assert.equal(result.getFullYear(), 2026)
  assert.equal(result.getMonth(), 6)
  assert.equal(result.getDate(), 15)
  assert.equal(result.getHours(), 17)
  assert.equal(result.getMinutes(), 30)
})

test('отмечает задачу выполненной с точным временем действия', () => {
  const now = new Date('2026-07-14T10:00:00.000Z')
  const task = { done: false, doneAt: null }
  assert.equal(applyTaskAction(task, 'complete', now), true)
  assert.equal(task.done, true)
  assert.equal(task.doneAt, now)
})
