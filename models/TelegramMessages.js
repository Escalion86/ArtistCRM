import mongoose from 'mongoose'
import telegramMessagesSchema from '@schemas/telegramMessagesSchema'

const TelegramMessagesSchema = new mongoose.Schema(telegramMessagesSchema, {
  timestamps: true,
})

TelegramMessagesSchema.index(
  { tenantId: 1, telegramChatId: 1, telegramMessageId: 1 },
  { unique: true }
)
TelegramMessagesSchema.index({
  tenantId: 1,
  conversationId: 1,
  sentAt: 1,
})
TelegramMessagesSchema.index({ tenantId: 1, clientId: 1, sentAt: -1 })

export default mongoose.models.TelegramMessages ||
  mongoose.model('TelegramMessages', TelegramMessagesSchema)
