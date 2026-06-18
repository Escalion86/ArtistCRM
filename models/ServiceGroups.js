import mongoose from 'mongoose'
import serviceGroupsSchema from '@schemas/serviceGroupsSchema'

const ServiceGroupsSchema = new mongoose.Schema(serviceGroupsSchema, {
  timestamps: true,
})
ServiceGroupsSchema.index({ tenantId: 1, title: 1 })
ServiceGroupsSchema.index({ tenantId: 1, order: 1 })

export default mongoose.models.ServiceGroups ||
  mongoose.model('ServiceGroups', ServiceGroupsSchema)
