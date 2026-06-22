import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeReminderTime,
  shouldRunForTenantReminderTime,
} from './additionalEventsReminderTime.js'

test('normalizes reminder time to supported 15 minute values', () => {
  assert.equal(normalizeReminderTime('09:15'), '09:15')
  assert.equal(normalizeReminderTime('09:10'), '10:00')
  assert.equal(normalizeReminderTime('bad'), '10:00')
})

test('matches tenant reminder time during the same 15 minute cron window', () => {
  const siteSettings = {
    timeZone: 'Asia/Krasnoyarsk',
    custom: {
      additionalEventsPushTime: '10:00',
    },
  }

  assert.equal(
    shouldRunForTenantReminderTime(
      siteSettings,
      new Date('2026-06-22T03:00:00.000Z')
    ),
    true
  )
  assert.equal(
    shouldRunForTenantReminderTime(
      siteSettings,
      new Date('2026-06-22T03:03:30.000Z')
    ),
    true
  )
  assert.equal(
    shouldRunForTenantReminderTime(
      siteSettings,
      new Date('2026-06-22T03:14:59.000Z')
    ),
    true
  )
})

test('does not match before the selected local reminder time or after the cron window', () => {
  const siteSettings = {
    timeZone: 'Asia/Krasnoyarsk',
    custom: {
      additionalEventsPushTime: '10:00',
    },
  }

  assert.equal(
    shouldRunForTenantReminderTime(
      siteSettings,
      new Date('2026-06-22T02:59:59.000Z')
    ),
    false
  )
  assert.equal(
    shouldRunForTenantReminderTime(
      siteSettings,
      new Date('2026-06-22T03:15:00.000Z')
    ),
    false
  )
})
