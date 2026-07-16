import mongoose from 'mongoose'
import mobileSyncOperationsSchema from '@schemas/mobileSyncOperationsSchema'

const MobileSyncOperationsSchema = new mongoose.Schema(
  mobileSyncOperationsSchema,
  { timestamps: true }
)

MobileSyncOperationsSchema.index(
  { tenantId: 1, operationId: 1 },
  { unique: true }
)
MobileSyncOperationsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.MobileSyncOperations ||
  mongoose.model('MobileSyncOperations', MobileSyncOperationsSchema)
