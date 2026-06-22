import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import pushReminderLogsSchema from './pushReminderLogsSchema.js'

const PushReminderLogTest = mongoose.models.PushReminderLogTest ||
  mongoose.model(
    'PushReminderLogTest',
    new mongoose.Schema(pushReminderLogsSchema)
  )

test('allows daily summary reminder log without event id', () => {
  const log = new PushReminderLogTest({
    tenantId: new mongoose.Types.ObjectId(),
    reminderType: 'summary',
    dateKey: '2026-06-22',
    sentAt: new Date('2026-06-22T03:00:00.000Z'),
  })

  const error = log.validateSync()

  assert.equal(error, undefined)
})

test('requires event id for per-event reminder logs', () => {
  const log = new PushReminderLogTest({
    tenantId: new mongoose.Types.ObjectId(),
    reminderType: 'overdue',
    dateKey: '2026-06-22',
  })

  const error = log.validateSync()

  assert.match(error?.errors?.eventId?.message || '', /required/i)
})
