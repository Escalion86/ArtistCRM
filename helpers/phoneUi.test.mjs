import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatPhoneWithPlus,
  getInitialClientPhone,
  getPhoneDigits,
} from './phoneUi.js'

test('formatPhoneWithPlus adds one leading plus', () => {
  assert.equal(formatPhoneWithPlus(79991234567), '+79991234567')
  assert.equal(formatPhoneWithPlus('+79991234567'), '+79991234567')
  assert.equal(formatPhoneWithPlus(null), '')
})

test('getPhoneDigits removes phone formatting', () => {
  assert.equal(getPhoneDigits('+7 (999) 123-45-67'), '79991234567')
})

test('getInitialClientPhone normalizes Russian phone search input', () => {
  assert.equal(getInitialClientPhone('+7 (999) 123-45-67'), 79991234567)
  assert.equal(getInitialClientPhone('8 999 123-45-67'), 79991234567)
  assert.equal(getInitialClientPhone('9991234567'), 79991234567)
})

test('getInitialClientPhone ignores text without a complete phone', () => {
  assert.equal(getInitialClientPhone('Иван'), null)
  assert.equal(getInitialClientPhone('12345'), null)
  assert.equal(getInitialClientPhone('19991234567'), null)
})
