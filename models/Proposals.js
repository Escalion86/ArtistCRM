import mongoose from 'mongoose'
import proposalsSchema from '@schemas/proposalsSchema'

const ProposalsSchema = new mongoose.Schema(proposalsSchema, { timestamps: true })
ProposalsSchema.index({ tenantId: 1, eventId: 1, version: -1 })
ProposalsSchema.index({ publicId: 1 }, { unique: true, sparse: true })

export default mongoose.models.Proposals ||
  mongoose.model('Proposals', ProposalsSchema)
