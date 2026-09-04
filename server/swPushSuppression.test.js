import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACTIVE_CONVERSATION_TTL_MS,
  shouldSuppressIncomingMessagePush,
} from './swPushSuppression.js'

const buildPayload = (conversationKey = 'client-1') => ({
  data: {
    type: 'incoming_messenger_message',
    conversationKey,
  },
})

test('suppresses push for a conversation with a fresh heartbeat', () => {
  const now = Date.now()
  const active = { 'client-1': now - 10 * 1000 }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    true
  )
})

test('does not suppress push of another type', () => {
  const now = Date.now()
  const payload = buildPayload()
  payload.data.type = 'telephony_recording'
  assert.equal(
    shouldSuppressIncomingMessagePush(payload, { 'client-1': now }, now),
    false
  )
})

test('does not suppress when heartbeat is stale', () => {
  const now = Date.now()
  const active = { 'client-1': now - ACTIVE_CONVERSATION_TTL_MS - 1000 }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    false
  )
})

test('does not suppress other conversations or missing key', () => {
  const now = Date.now()
  const active = { 'client-2': now }
  assert.equal(
    shouldSuppressIncomingMessagePush(buildPayload(), active, now),
    false
  )
  assert.equal(
    shouldSuppressIncomingMessagePush({ data: { type: 'incoming_messenger_message' } }, active, now),
    false
  )
  assert.equal(shouldSuppressIncomingMessagePush(buildPayload(), {}, now), false)
})
