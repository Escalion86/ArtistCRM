import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sanitizeMobileConversationPayload,
  serializeMobileConversation,
  serializeMobileConversationMessage,
} from './conversations.js'

test('serializeMobileConversation не передаёт служебные данные провайдера', () => {
  const result = serializeMobileConversation({
    _id: 'conversation-1',
    tenantId: 'tenant-secret',
    avitoChatId: 'provider-secret',
    raw: { token: 'secret' },
    clientName: 'Анна',
    unreadCount: 2,
    lastMessageAt: new Date('2026-07-15T10:00:00.000Z'),
  })

  assert.deepEqual(result, {
    _id: 'conversation-1',
    clientId: null,
    eventId: null,
    clientName: 'Анна',
    status: 'open',
    lastMessageText: '',
    lastMessageAt: '2026-07-15T10:00:00.000Z',
    unreadCount: 2,
    avitoItemTitle: '',
    createdAt: null,
    updatedAt: null,
  })
  assert.equal('raw' in result, false)
  assert.equal('avitoChatId' in result, false)
  assert.equal('tenantId' in result, false)
})

test('serializeMobileConversationMessage оставляет только поля чата', () => {
  const result = serializeMobileConversationMessage({
    _id: 'message-1',
    direction: 'outgoing',
    text: 'Здравствуйте',
    status: 'sent',
    raw: { response: 'secret' },
    vkPeerId: 'provider-id',
  })

  assert.deepEqual(result, {
    _id: 'message-1',
    direction: 'outgoing',
    text: 'Здравствуйте',
    sentAt: null,
    status: 'sent',
  })
})

test('sanitizeMobileConversationPayload очищает и успешные, и ошибочные ответы', () => {
  const success = sanitizeMobileConversationPayload({
    success: true,
    data: {
      conversation: { _id: 'conversation-1', raw: { secret: true } },
      messages: [{ _id: 'message-1', raw: { secret: true } }],
    },
  })
  const failure = sanitizeMobileConversationPayload({
    success: false,
    error: { code: 'send_failed', message: 'Ошибка' },
    data: { message: { _id: 'message-2', raw: { secret: true } } },
  })

  assert.equal('raw' in success.data.conversation, false)
  assert.equal('raw' in success.data.messages[0], false)
  assert.equal('raw' in failure.data.message, false)
})
