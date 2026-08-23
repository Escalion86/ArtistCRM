import mongoose from 'mongoose'
import proposalTemplatesSchema from '@schemas/proposalTemplatesSchema'

const ProposalTemplatesSchema = new mongoose.Schema(proposalTemplatesSchema, {
  timestamps: true,
})
ProposalTemplatesSchema.index({ tenantId: 1, status: 1, updatedAt: -1 })

export default mongoose.models.ProposalTemplates ||
  mongoose.model('ProposalTemplates', ProposalTemplatesSchema)
