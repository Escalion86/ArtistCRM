import { Schema } from 'mongoose'

const supportTicketsSchema = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  createdByLabel: { type: String, maxlength: 200, default: '' },
  category: {
    type: String,
    enum: ['bug', 'idea', 'question'],
    required: true,
  },
  title: { type: String, required: true, maxlength: 160, trim: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open',
  },
  lastMessageAt: { type: Date, default: () => new Date() },
  lastMessageByRole: {
    type: String,
    enum: ['user', 'developer'],
    default: 'user',
  },
  userLastReadAt: { type: Date, default: () => new Date() },
  developerLastReadAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
}

export default supportTicketsSchema
