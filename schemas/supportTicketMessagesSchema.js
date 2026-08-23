import { Schema } from 'mongoose'

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 2000 },
    name: { type: String, required: true, maxlength: 255 },
    size: { type: Number, required: true, min: 0 },
    type: { type: String, required: true, maxlength: 100 },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
)

const supportTicketMessagesSchema = {
  ticketId: {
    type: Schema.Types.ObjectId,
    ref: 'SupportTickets',
    required: true,
  },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  authorRole: {
    type: String,
    enum: ['user', 'developer'],
    required: true,
  },
  authorLabel: { type: String, maxlength: 200, default: '' },
  body: { type: String, required: true, maxlength: 5000, trim: true },
  attachments: { type: [attachmentSchema], default: [] },
}

export default supportTicketMessagesSchema
