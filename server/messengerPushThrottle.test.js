import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MESSENGER_EXPO_PUSH_WINDOW_MS,
  shouldSendExpoPushForConversation,
} from './messengerPushThrottle.js'

test('sends expo push when conversation was never notified', () => {
  assert.equal(shouldSendExpoPushForConversation({ lastPushAt: null }), true)
  assert.equal(shouldSendExpoPushForConversation({}), true)
})

test('suppresses expo push inside the throttle window', () => {
  const now = Date.now()
  const lastPushAt = new Date(now - 30 * 1000)
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt, now }),
    false
  )
})

test('sends expo push again after the window passed', () => {
  const now = Date.now()
  const lastPushAt = new Date(now - MESSENGER_EXPO_PUSH_WINDOW_MS - 1000)
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt, now }),
    true
  )
})

test('treats invalid lastPushAt as never notified', () => {
  assert.equal(
    shouldSendExpoPushForConversation({ lastPushAt: 'not-a-date' }),
    true
  )
})
