import { Schema } from 'mongoose'

const telegramMessagesSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'TelegramConversations',
    required: true,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Clients',
    default: null,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Events',
    default: null,
  },
  businessConnectionId: {
    type: String,
    required: true,
  },
  telegramChatId: {
    type: String,
    required: true,
  },
  telegramMessageId: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  attachments: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  sentAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['received', 'sent', 'failed'],
    default: 'received',
  },
}

export default telegramMessagesSchema
