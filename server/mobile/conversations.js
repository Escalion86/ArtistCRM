const asId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value.toString === 'function') return value.toString()
  return null
}

const asIsoDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const serializeMobileConversation = (conversation = {}) => ({
  _id: asId(conversation._id),
  clientId: asId(conversation.clientId),
  eventId: asId(conversation.eventId),
  clientName: String(conversation.clientName || ''),
  status: ['open', 'closed', 'ignored'].includes(conversation.status)
    ? conversation.status
    : 'open',
  lastMessageText: String(conversation.lastMessageText || ''),
  lastMessageAt: asIsoDate(conversation.lastMessageAt),
  unreadCount: Math.max(0, Number(conversation.unreadCount || 0)),
  avitoItemTitle: String(conversation.avitoItemTitle || ''),
  createdAt: asIsoDate(conversation.createdAt),
  updatedAt: asIsoDate(conversation.updatedAt),
})

export const serializeMobileConversationMessage = (message = {}) => ({
  _id: asId(message._id),
  direction: message.direction === 'outgoing' ? 'outgoing' : 'incoming',
  text: String(message.text || ''),
  sentAt: asIsoDate(message.sentAt),
  status: ['received', 'sent', 'failed'].includes(message.status)
    ? message.status
    : 'received',
})

export const sanitizeMobileConversationPayload = (payload = {}) => {
  if (!payload?.data) return payload

  if (Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map(serializeMobileConversation),
    }
  }

  if (payload.data.conversation || payload.data.messages) {
    return {
      ...payload,
      data: {
        conversation: serializeMobileConversation(payload.data.conversation),
        messages: Array.isArray(payload.data.messages)
          ? payload.data.messages.map(serializeMobileConversationMessage)
          : [],
      },
    }
  }

  if (payload.data.message) {
    return {
      ...payload,
      data: {
        message: serializeMobileConversationMessage(payload.data.message),
      },
    }
  }

  return {
    ...payload,
    data: serializeMobileConversation(payload.data),
  }
}
