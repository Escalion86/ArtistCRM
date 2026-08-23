import mongoose from 'mongoose'
import supportTicketMessagesSchema from '@schemas/supportTicketMessagesSchema'

const SupportTicketMessagesSchema = new mongoose.Schema(
  supportTicketMessagesSchema,
  { timestamps: { createdAt: true, updatedAt: false } }
)

SupportTicketMessagesSchema.index({ ticketId: 1, createdAt: 1, _id: 1 })
SupportTicketMessagesSchema.index({ tenantId: 1, createdAt: -1 })

export default mongoose.models.SupportTicketMessages ||
  mongoose.model('SupportTicketMessages', SupportTicketMessagesSchema)
