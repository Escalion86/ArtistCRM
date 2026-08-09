import mongoose from 'mongoose'
import telegramConversationsSchema from '@schemas/telegramConversationsSchema'

const TelegramConversationsSchema = new mongoose.Schema(
  telegramConversationsSchema,
  { timestamps: true }
)

TelegramConversationsSchema.index(
  { tenantId: 1, telegramChatId: 1 },
  { unique: true }
)
TelegramConversationsSchema.index({
  tenantId: 1,
  clientId: 1,
  lastMessageAt: -1,
})
TelegramConversationsSchema.index({ tenantId: 1, telegramUserId: 1 })

export default mongoose.models.TelegramConversations ||
  mongoose.model('TelegramConversations', TelegramConversationsSchema)
