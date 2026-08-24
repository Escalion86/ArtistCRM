import test from 'node:test'
import assert from 'node:assert/strict'

import {
  filterConversationsByClientIds,
  mergeUnreadConversations,
} from './messengerAttention.js'

test('keeps only conversations linked to existing clients', () => {
  assert.deepEqual(
    filterConversationsByClientIds(
      [
        { _id: 'chat-1', clientId: 'client-1' },
        { _id: 'chat-2', clientId: 'deleted-client' },
        { _id: 'chat-3', clientId: null },
      ],
      ['client-1']
    ),
    [{ _id: 'chat-1', clientId: 'client-1' }]
  )
})

test('merges unread conversations by client across providers', () => {
  const result = mergeUnreadConversations([
    {
      provider: 'telegram',
      items: [
        {
          _id: 'tg-1',
          clientId: 'client-1',
          eventId: 'event-1',
          unreadCount: 2,
          lastMessageText: 'Telegram',
          lastMessageAt: '2026-08-25T10:00:00.000Z',
        },
      ],
    },
    {
      provider: 'vk',
      items: [
        {
          _id: 'vk-1',
          clientId: 'client-1',
          eventId: 'event-2',
          unreadCount: 3,
          lastMessageText: 'VK',
          lastMessageAt: '2026-08-25T11:00:00.000Z',
        },
      ],
    },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0].unreadCount, 5)
  assert.deepEqual(result[0].providers, ['telegram', 'vk'])
  assert.deepEqual(result[0].eventIds, ['event-1', 'event-2'])
  assert.equal(result[0].lastMessageText, 'VK')
})

test('keeps unlinked provider conversations as separate attention items', () => {
  const result = mergeUnreadConversations([
    {
      provider: 'avito',
      items: [
        { _id: 'chat-1', unreadCount: 1, clientName: 'Первый' },
        { _id: 'chat-2', unreadCount: 2, clientName: 'Второй' },
      ],
    },
  ])

  assert.deepEqual(
    result.map((item) => item.key),
    ['avito:chat-1', 'avito:chat-2']
  )
})
