import { Schema } from 'mongoose'

const mobileSyncOperationsSchema = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  operationId: { type: String, required: true },
  operationHash: { type: String, default: '' },
  phase: {
    type: String,
    enum: ['reserved', 'applying', 'completed'],
    default: 'reserved',
  },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  status: {
    type: String,
    enum: ['processing', 'applied', 'conflict', 'failed'],
    required: true,
  },
  response: { type: Schema.Types.Mixed, default: null },
  expiresAt: { type: Date, required: true },
}

export default mobileSyncOperationsSchema
