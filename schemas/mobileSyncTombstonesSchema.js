import { Schema } from 'mongoose'

const mobileSyncTombstonesSchema = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  version: { type: Number, default: 1 },
  deletedAt: { type: Date, default: () => new Date() },
  purgeAt: { type: Date, required: true },
}

export default mobileSyncTombstonesSchema
