import mongoose from 'mongoose'
import mobileSyncTombstonesSchema from '@schemas/mobileSyncTombstonesSchema'

const MobileSyncTombstonesSchema = new mongoose.Schema(
  mobileSyncTombstonesSchema,
  { timestamps: true }
)

MobileSyncTombstonesSchema.index(
  { tenantId: 1, entityType: 1, entityId: 1 },
  { unique: true }
)
MobileSyncTombstonesSchema.index({ tenantId: 1, deletedAt: 1 })
MobileSyncTombstonesSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.MobileSyncTombstones ||
  mongoose.model('MobileSyncTombstones', MobileSyncTombstonesSchema)
