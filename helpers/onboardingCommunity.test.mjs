import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTelegramCommunityUrlError,
  normalizeTelegramCommunityUrl,
} from './onboardingCommunity.mjs'

test('normalizes supported Telegram community links', () => {
  assert.equal(
    normalizeTelegramCommunityUrl('t.me/artistcrm_chat'),
    'https://t.me/artistcrm_chat'
  )
  assert.equal(
    normalizeTelegramCommunityUrl('https://telegram.me/+invite-code'),
    'https://t.me/+invite-code'
  )
})

test('rejects non-Telegram and incomplete links', () => {
  assert.equal(normalizeTelegramCommunityUrl('https://example.com/group'), '')
  assert.equal(normalizeTelegramCommunityUrl('https://t.me'), '')
  assert.match(getTelegramCommunityUrlError('example.com'), /t\.me/)
})

test('allows an empty value so the invitation can be disabled', () => {
  assert.equal(normalizeTelegramCommunityUrl(''), '')
  assert.equal(getTelegramCommunityUrlError(''), '')
})
