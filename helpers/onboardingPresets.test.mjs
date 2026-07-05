import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ONBOARDING_ACTIVITY_PRESETS,
  getOnboardingPreset,
  getStarterServicesForPreset,
  buildDemoEventPayload,
  getStatusEducationItems,
} from './onboardingPresets.mjs'

test('returns events preset by key', () => {
  const preset = getOnboardingPreset('events')
  assert.equal(preset.key, 'events')
  assert.match(preset.title, /Мероприятия/)
  assert.ok(preset.starterServices.length >= 2)
})

test('falls back to other preset for unknown key', () => {
  const preset = getOnboardingPreset('unknown')
  assert.equal(preset.key, 'other')
})

test('starter services are safe service create payloads', () => {
  const services = getStarterServicesForPreset('custom_products')
  assert.deepEqual(
    services.map((service) => Object.keys(service).sort()),
    services.map(() =>
      ['description', 'duration', 'groupId', 'images', 'price', 'title'].sort()
    )
  )
  assert.equal(services[0].groupId, null)
  assert.equal(services[0].images.length, 0)
})

test('demo event payload uses draft status and selected services', () => {
  const payload = buildDemoEventPayload('beauty', ['service-1'])
  assert.equal(payload.status, 'draft')
  assert.equal(payload.servicesIds[0], 'service-1')
  assert.match(payload.eventType, /образ/i)
  assert.equal(payload.calendarImportChecked, false)
  assert.equal(payload.isTransferred, false)
  assert.equal(payload.additionalEvents.length, 1)
  assert.match(payload.additionalEvents[0].title, /Связаться|Уточнить/)
})

test('demo event payload is visibly marked as educational', () => {
  const payload = buildDemoEventPayload('other', [])
  assert.match(payload.description, /Учебная заявка/)
})

test('demo event has no event date and creates tomorrow follow-up task', () => {
  const payload = buildDemoEventPayload('events', [])
  const taskDate = new Date(payload.additionalEvents[0].date)

  assert.equal(payload.eventDate, null)
  assert.equal(payload.dateEnd, null)
  assert.equal(taskDate.getHours(), 12)
  assert.equal(taskDate.getMinutes(), 0)
  assert.equal(taskDate.getSeconds(), 0)
})

test('status education explains all canonical statuses', () => {
  const items = getStatusEducationItems('other')
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'closed', 'canceled']
  )
  assert.match(items[0].title, /Заявка/)
  assert.match(items[1].description, /подтвердил/)
  assert.match(items[2].description, /заверш/)
})

test('exports the agreed preset keys', () => {
  assert.deepEqual(
    ONBOARDING_ACTIVITY_PRESETS.map((preset) => preset.key),
    ['events', 'photo_video', 'custom_products', 'beauty', 'consulting', 'other']
  )
})
