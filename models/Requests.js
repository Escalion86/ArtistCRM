import mongoose from 'mongoose'
import requestsSchema from '@schemas/requestsSchema'

const RequestsSchema = new mongoose.Schema(requestsSchema, { timestamps: true })
RequestsSchema.index({ tenantId: 1, createdAt: -1 })
RequestsSchema.index({ tenantId: 1, status: 1 })
RequestsSchema.index({ tenantId: 1, eventDate: -1 })
RequestsSchema.index({ tenantId: 1, clientId: 1 })

export default mongoose.models.Requests ||
  mongoose.model('Requests', RequestsSchema)
