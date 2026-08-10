import test from 'node:test'
import assert from 'node:assert/strict'

import { getTelegramBusinessMessageDirection } from './telegramBusinessMessage.js'

test('recognizes an incoming Telegram Business message from the chat peer', () => {
  assert.equal(
    getTelegramBusinessMessageDirection({
      message: { from: { id: 101 }, chat: { id: 101 } },
      businessAccountUserId: '202',
    }),
    'incoming'
  )
})

test('recognizes a message sent by the business account owner', () => {
  assert.equal(
    getTelegramBusinessMessageDirection({
      message: { from: { id: 202 }, chat: { id: 101 } },
      businessAccountUserId: '',
    }),
    'outgoing'
  )
})

test('recognizes a message sent through the connected business bot', () => {
  assert.equal(
    getTelegramBusinessMessageDirection({
      message: {
        from: { id: 202 },
        chat: { id: 101 },
        sender_business_bot: { id: 303 },
      },
      businessAccountUserId: '',
    }),
    'outgoing'
  )
})
