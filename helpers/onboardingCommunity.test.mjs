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

test('normalizes shorthand invites to working Telegram deep links', () => {
  const expected = 'tg://join?invite=EwOkTZV5lzw3Yjcy'
  for (const value of [
    'tg://+EwOkTZV5lzw3Yjcy',
    '  tg://+EwOkTZV5lzw3Yjcy  ',
    'tg://+EwOkTZV5lzw3Yjcy/',
    'TG://+EwOkTZV5lzw3Yjcy#fragment',
    expected,
  ]) {
    assert.equal(normalizeTelegramCommunityUrl(value), expected)
    assert.equal(getTelegramCommunityUrlError(value), '')
  }
  assert.equal(
    normalizeTelegramCommunityUrl('tg://join?invite=Ab_c-123'),
    'tg://join?invite=Ab_c-123'
  )
})

test('rejects malformed invites and unrelated Telegram actions', () => {
  for (const value of [
    'tg://+',
    'tg://join?invite=',
    'tg://+invite code',
    'tg://+invite/path',
    'tg://+invite@evil.example',
    'tg://join?invite=code&invite=other',
    'tg://proxy?server=example.com',
    'javascript:alert(1)',
  ]) {
    assert.equal(normalizeTelegramCommunityUrl(value), '', value)
    assert.ok(getTelegramCommunityUrlError(value), value)
  }
})

test('allows an empty value so the invitation can be disabled', () => {
  assert.equal(normalizeTelegramCommunityUrl(''), '')
  assert.equal(getTelegramCommunityUrlError(''), '')
})
