import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAcquisitionFromSearchParams,
  formatRegistrationSource,
  getAcquisitionFromRequest,
  getRegistrationSourceFromRequest,
  getUserRegistrationSource,
  normalizeRegistrationSource,
  parseAcquisitionCookie,
  serializeAcquisitionCookie,
} from './registrationSource.mjs'

test('normalizeRegistrationSource accepts safe source slugs', () => {
  assert.equal(
    normalizeRegistrationSource('  Magicians_Chat-Krasnoyarsk  '),
    'magicians_chat-krasnoyarsk'
  )
})

test('normalizeRegistrationSource rejects unsafe or oversized values', () => {
  assert.equal(normalizeRegistrationSource('../chat'), '')
  assert.equal(normalizeRegistrationSource('чат-фокусников'), '')
  assert.equal(normalizeRegistrationSource('a'.repeat(65)), '')
})

test('formatRegistrationSource labels users without attribution', () => {
  assert.equal(formatRegistrationSource(''), 'Без метки')
  assert.equal(formatRegistrationSource('MAGIC_CHAT'), 'magic_chat')
})

test('getUserRegistrationSource prefers explicit registration source', () => {
  assert.equal(
    getUserRegistrationSource({
      registrationSource: 'focusnik-pilot',
      acquisition: { source: 'yandex' },
    }),
    'focusnik-pilot'
  )
})

test('getUserRegistrationSource falls back to acquisition source', () => {
  assert.equal(
    getUserRegistrationSource({
      registrationSource: '',
      acquisition: { source: 'Yandex' },
    }),
    'yandex'
  )
})

test('getUserRegistrationSource rejects missing or unsafe sources', () => {
  assert.equal(getUserRegistrationSource({}), '')
  assert.equal(
    getUserRegistrationSource({ acquisition: { source: '<script>' } }),
    ''
  )
})

test('getRegistrationSourceFromRequest reads and validates the attribution cookie', () => {
  const request = {
    cookies: {
      get: () => ({ value: 'MAGIC_CHAT' }),
    },
  }
  assert.equal(getRegistrationSourceFromRequest(request), 'magic_chat')
})

test('acquisition cookie keeps only whitelisted bounded attribution fields', () => {
  const searchParams = new URLSearchParams({
    utm_source: 'Yandex',
    utm_medium: 'CPC',
    utm_campaign: 'magicians_launch',
    utm_content: '<script>creative-a',
    utm_term: 'crm для фокусников',
    yclid: '12345',
    ignored: 'secret',
  })
  const acquisition = buildAcquisitionFromSearchParams({
    searchParams,
    landingPath: '/crm-dlya-fokusnikov',
  })
  assert.deepEqual(acquisition, {
    source: 'yandex',
    medium: 'cpc',
    campaign: 'magicians_launch',
    content: 'scriptcreative-a',
    term: 'crm для фокусников',
    yclid: '12345',
    landingPath: '/crm-dlya-fokusnikov',
  })
  assert.deepEqual(parseAcquisitionCookie(serializeAcquisitionCookie(acquisition)), acquisition)
})

test('getAcquisitionFromRequest safely ignores malformed cookies', () => {
  const valid = serializeAcquisitionCookie({ source: 'telegram', medium: 'community' })
  assert.equal(
    getAcquisitionFromRequest({ cookies: { get: () => ({ value: valid }) } })?.source,
    'telegram'
  )
  assert.equal(
    getAcquisitionFromRequest({ cookies: { get: () => ({ value: '%broken' }) } }),
    null
  )
})
