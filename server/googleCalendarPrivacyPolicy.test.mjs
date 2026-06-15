import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const privacySource = await readFile(
  new URL('../app/privacy/page.js', import.meta.url),
  'utf8'
)
const disconnectRouteSource = await readFile(
  new URL('../app/api/google-calendar/disconnect/route.js', import.meta.url),
  'utf8'
)

test('политика подробно раскрывает обработку данных Google Calendar', () => {
  const requiredPatterns = [
    /Данные Google Calendar/i,
    /OAuth/i,
    /токен/i,
    /список календарей/i,
    /импорт/i,
    /создавать,\s+обновлять\s+и\s+удалять\s+события/i,
    /имя и контакты\s+клиента/i,
    /финансов/i,
  ]

  for (const pattern of requiredPatterns) {
    assert.match(privacySource, pattern)
  }
})

test('политика содержит требования Google Limited Use и точную ссылку', () => {
  assert.match(privacySource, /Limited Use/)
  assert.match(
    privacySource,
    /https:\/\/developers\.google\.com\/terms\/api-services-user-data-policy/
  )
  assert.match(privacySource, /не прода[её]т/i)
  assert.match(privacySource, /реклам/i)
})

test('политика объясняет отключение Google Calendar и удаление данных', () => {
  assert.match(privacySource, /отключить интеграцию/i)
  assert.match(privacySource, /отозвать доступ/i)
  assert.match(privacySource, /Escalion86@gmail\.com/)
  assert.match(privacySource, /удален/i)
})

test('описание отключения соответствует фактической очистке данных интеграции', () => {
  for (const field of [
    'calendarId',
    'refreshToken',
    'accessToken',
    'tokenExpiry',
    'scope',
    'syncToken',
    'connectedAt',
    'email',
  ]) {
    assert.match(disconnectRouteSource, new RegExp(`${field}:`))
  }

  assert.doesNotMatch(disconnectRouteSource, /calendarName:\s*['"]/)
  assert.match(privacySource, /OAuth-токены[^.]*удаляются/i)
  assert.match(privacySource, /идентификатор\s+календаря\s+удаляется/i)
  assert.match(privacySource, /название календаря\s+может\s+сохраняться/i)
  assert.doesNotMatch(privacySource, /связь с выбранным календарем\s+удаляется/i)
})

test('политика правдиво раскрывает использование Яндекс Метрики', () => {
  assert.match(privacySource, /Яндекс Метрик/i)
  assert.match(privacySource, /Вебвизор/i)
  assert.doesNotMatch(
    privacySource,
    /не использует аналитические системы и не ведет поведенческую аналитику/i
  )
})
