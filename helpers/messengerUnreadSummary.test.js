import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearMessengerUnreadForClient,
  mergeMessengerUnreadGroups,
} from './messengerUnreadSummary.js'

test('sums unread messages and conversations across providers', () => {
  assert.deepEqual(
    mergeMessengerUnreadGroups([
      [{ _id: 'client-1', conversationCount: 1, unreadCount: 2 }],
      [
        { _id: 'client-1', conversationCount: 2, unreadCount: 3 },
        { _id: 'client-2', conversationCount: 1, unreadCount: 1 },
      ],
    ]),
    {
      'client-1': { conversationCount: 3, unreadCount: 5 },
      'client-2': { conversationCount: 1, unreadCount: 1 },
    }
  )
})

test('clears one client without mutating other summary entries', () => {
  const summary = {
    byClientId: {
      'client-1': { conversationCount: 2, unreadCount: 4 },
      'client-2': { conversationCount: 1, unreadCount: 3 },
    },
  }

  assert.deepEqual(clearMessengerUnreadForClient(summary, 'client-1'), {
    byClientId: {
      'client-1': { conversationCount: 2, unreadCount: 0 },
      'client-2': { conversationCount: 1, unreadCount: 3 },
    },
  })
  assert.equal(summary.byClientId['client-1'].unreadCount, 4)
})
