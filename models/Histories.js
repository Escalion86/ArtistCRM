import mongoose from 'mongoose'
import historiesSchema from '@schemas/historiesSchema'

const HistoriesSchema = new mongoose.Schema(historiesSchema, {
  timestamps: { createdAt: true, updatedAt: false },
})
HistoriesSchema.index({ tenantId: 1, occurredAt: -1, _id: -1 })
HistoriesSchema.index({
  tenantId: 1,
  entityType: 1,
  entityId: 1,
  occurredAt: -1,
  _id: -1,
})
HistoriesSchema.index({ tenantId: 1, operation: 1, occurredAt: -1 })
HistoriesSchema.index(
  { tenantId: 1, operationId: 1 },
  {
    unique: true,
    partialFilterExpression: { operationId: { $type: 'string' } },
  }
)

export default mongoose.models.Histories ||
  mongoose.model('Histories', HistoriesSchema)
