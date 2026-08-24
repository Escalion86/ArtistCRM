import test from 'node:test'
import assert from 'node:assert/strict'

import { buildIncomingMessagePushPayload } from './incomingMessageNotification.js'

test('builds incoming message push with client and nearest event', () => {
  const payload = buildIncomingMessagePushPayload({
    provider: 'telegram',
    messageId: 'message-1',
    messageText: 'Добрый день, уточните время начала',
    clientId: 'client-1',
    clientName: 'Анна Иванова',
    event: {
      _id: 'event-1',
      eventType: 'Свадьба',
      eventDate: '2026-08-26T12:00:00.000Z',
    },
  })

  assert.equal(payload.title, 'Новое сообщение · Telegram')
  assert.match(payload.body, /Анна Иванова/)
  assert.match(payload.body, /Ближайшее: Свадьба/)
  assert.equal(
    payload.data.url,
    '/cabinet/eventsUpcoming?openEvent=event-1'
  )
  assert.equal(payload.data.clientId, 'client-1')
})

test('builds a safe fallback when event is not linked yet', () => {
  const payload = buildIncomingMessagePushPayload({
    provider: 'avito',
    messageId: 'message-2',
    clientName: 'Клиент Avito',
  })

  assert.equal(payload.body, 'Клиент Avito')
  assert.equal(payload.data.url, '/cabinet/clients')
  assert.equal(payload.data.eventId, '')
})
