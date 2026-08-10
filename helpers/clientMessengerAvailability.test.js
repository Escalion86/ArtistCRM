import test from 'node:test'
import assert from 'node:assert/strict'
import { resetClientMessengerAvailability } from './clientMessengerAvailability.js'

test('resets Telegram phone availability when client phone changes', () => {
  assert.deepEqual(
    resetClientMessengerAvailability(
      {
        phone: 79991234567,
        telegram: '',
        telegramPhone: 79991234567,
        telegramPhoneUnavailable: true,
      },
      { phone: 79997654321 }
    ),
    {
      phone: 79997654321,
      telegramPhone: null,
      telegramPhoneUnavailable: false,
    }
  )
})

test('resets availability when Telegram username changes', () => {
  assert.deepEqual(
    resetClientMessengerAvailability(
      { phone: 79991234567, telegram: '', telegramPhoneUnavailable: true },
      { telegram: '@artist_crm' }
    ),
    { telegram: '@artist_crm', telegramPhoneUnavailable: false }
  )
})

test('keeps availability state when contacts are unchanged', () => {
  assert.deepEqual(
    resetClientMessengerAvailability(
      { phone: 79991234567, telegram: 'Artist_CRM' },
      {
        phone: '+7 (999) 123-45-67',
        telegram: '@artist_crm',
        telegramPhoneUnavailable: true,
      }
    ),
    {
      phone: '+7 (999) 123-45-67',
      telegram: '@artist_crm',
      telegramPhoneUnavailable: true,
    }
  )
})

test('allows marking the current phone as unavailable without contact changes', () => {
  assert.deepEqual(
    resetClientMessengerAvailability(
      { phone: 79991234567, telegram: '' },
      { telegramPhoneUnavailable: true }
    ),
    { telegramPhoneUnavailable: true }
  )
})
