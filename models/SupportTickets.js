import mongoose from 'mongoose'
import supportTicketsSchema from '@schemas/supportTicketsSchema'

const SupportTicketsSchema = new mongoose.Schema(supportTicketsSchema, {
  timestamps: true,
})

SupportTicketsSchema.index({ tenantId: 1, lastMessageAt: -1, _id: -1 })
SupportTicketsSchema.index({ status: 1, lastMessageAt: -1, _id: -1 })
SupportTicketsSchema.index({ createdBy: 1, createdAt: -1 })

export default mongoose.models.SupportTickets ||
  mongoose.model('SupportTickets', SupportTicketsSchema)
