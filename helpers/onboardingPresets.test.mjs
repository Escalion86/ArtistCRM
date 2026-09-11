import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ONBOARDING_ACTIVITY_PRESETS,
  getOnboardingPreset,
  getStarterServicesForPreset,
  areOnboardingServicesValid,
  buildDemoEventPayload,
  getStatusEducationItems,
} from './onboardingPresets.mjs'

test('onboarding requires at least one completely named service', () => {
  assert.equal(areOnboardingServicesValid([]), false)
  assert.equal(
    areOnboardingServicesValid([{ title: '  ', price: 0, duration: 0 }]),
    false
  )
  assert.equal(
    areOnboardingServicesValid([
      { title: 'Консультация', price: 0, duration: 0 },
    ]),
    true
  )
})

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

test('demo event is scheduled tomorrow from 14:00 to 15:00 in selected timezone', () => {
  const payload = buildDemoEventPayload('events', ['service-1', 'service-2'], {
    now: new Date('2026-09-03T20:00:00.000Z'),
    timeZone: 'Asia/Krasnoyarsk',
  })
  const eventDate = new Date(payload.eventDate)
  const dateEnd = new Date(payload.dateEnd)
  const taskDate = new Date(payload.additionalEvents[0].date)

  assert.equal(payload.eventDate, '2026-09-05T07:00:00.000Z')
  assert.equal(payload.dateEnd, '2026-09-05T08:00:00.000Z')
  assert.equal(eventDate.getTime() < dateEnd.getTime(), true)
  assert.equal(taskDate.toISOString(), '2026-09-05T05:00:00.000Z')
  assert.deepEqual(payload.servicesIds, ['service-1'])
})

test('status education explains all canonical statuses', () => {
  const items = getStatusEducationItems('other')
  assert.deepEqual(
    items.map((item) => item.status),
    ['draft', 'active', 'closed', 'canceled']
  )
  assert.match(items[0].title, /Заявка/)
  assert.equal(items.find((item) => item.status === 'active')?.title, 'Подтверждено')
  assert.match(items[1].description, /подтвердил/)
  assert.match(items[2].description, /заверш/)
})

test('exports the agreed preset keys', () => {
  assert.deepEqual(
    ONBOARDING_ACTIVITY_PRESETS.map((preset) => preset.key),
    ['events', 'photo_video', 'custom_products', 'beauty', 'consulting', 'repair_home', 'transport_delivery', 'digital_services', 'other']
  )
})
