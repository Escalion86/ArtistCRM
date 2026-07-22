import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatRegistrationSource,
  getRegistrationSourceFromRequest,
  normalizeRegistrationSource,
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

test('getRegistrationSourceFromRequest reads and validates the attribution cookie', () => {
  const request = {
    cookies: {
      get: () => ({ value: 'MAGIC_CHAT' }),
    },
  }
  assert.equal(getRegistrationSourceFromRequest(request), 'magic_chat')
})
