import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMobileReminderTime,
  serializeMobileNotificationSettings,
} from './notificationSettings.js'

test('время напоминаний принимает только шаг 15 минут', () => {
  assert.equal(normalizeMobileReminderTime('09:45'), '09:45')
  assert.equal(normalizeMobileReminderTime('09:44'), null)
  assert.equal(normalizeMobileReminderTime('25:00'), null)
})

test('настройки уведомлений не раскрывают custom целиком', () => {
  const result = serializeMobileNotificationSettings({
    siteSettings: {
      timeZone: 'Europe/Moscow',
      custom: {
        publicLeadPushEnabled: true,
        additionalEventsPushEnabled: false,
        additionalEventsPushTime: '08:15',
        aitunnelKey: 'secret',
      },
    },
    deviceSubscribed: true,
    activeDeviceCount: 2,
  })

  assert.deepEqual(result, {
    remindersEnabled: false,
    reminderTime: '08:15',
    pushConfigured: true,
    deviceSubscribed: true,
    activeDeviceCount: 2,
    timeZone: 'Europe/Moscow',
  })
  assert.equal('custom' in result, false)
})
