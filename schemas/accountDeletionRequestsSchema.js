import { Schema } from 'mongoose'

const accountDeletionRequestsSchema = {
  userId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'canceled'],
    default: 'pending',
  },
  source: { type: String, default: 'android' },
  requestedAt: { type: Date, default: () => new Date() },
  completedAt: { type: Date, default: null },
}

export default accountDeletionRequestsSchema
