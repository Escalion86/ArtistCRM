import mongoose from 'mongoose'
import paymentsSchema from '@schemas/paymentsSchema'

const PaymentsSchema = new mongoose.Schema(paymentsSchema, {
  timestamps: true,
})

PaymentsSchema.index({ tenantId: 1, userId: 1, createdAt: -1 })

export default mongoose.models.Payments ||
  mongoose.model('Payments', PaymentsSchema)
