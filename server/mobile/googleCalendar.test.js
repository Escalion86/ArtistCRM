import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearGoogleCalendarCredentials,
  serializeMobileGoogleCalendar,
} from './googleCalendar.js'

test('mobile Google Calendar status не раскрывает OAuth credentials', () => {
  const result = serializeMobileGoogleCalendar({
    enabled: true,
    calendarId: 'primary',
    calendarName: 'Рабочий',
    refreshToken: 'refresh-secret',
    accessToken: 'access-secret',
    scope: 'secret-scope',
    syncToken: 'sync-secret',
  }, { allowCalendarSync: true })
  assert.equal(result.connected, true)
  assert.equal(result.calendarName, 'Рабочий')
  const json = JSON.stringify(result)
  assert.equal(json.includes('refresh-secret'), false)
  assert.equal(json.includes('access-secret'), false)
  assert.equal(json.includes('sync-secret'), false)
})

test('отключение очищает токены, календарь и email', () => {
  const user = {
    googleCalendar: {
      enabled: true,
      calendarId: 'private-calendar',
      calendarName: 'Личный',
      refreshToken: 'refresh-secret',
      accessToken: 'access-secret',
      syncToken: 'sync-secret',
      email: 'private@example.test',
    },
  }
  clearGoogleCalendarCredentials(user)
  assert.equal(user.googleCalendar.enabled, false)
  assert.equal(user.googleCalendar.calendarId, '')
  assert.equal(user.googleCalendar.calendarName, '')
  assert.equal(user.googleCalendar.refreshToken, '')
  assert.equal(user.googleCalendar.accessToken, '')
  assert.equal(user.googleCalendar.syncToken, '')
  assert.equal(user.googleCalendar.email, '')
})
