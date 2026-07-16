import mongoose from 'mongoose'
import accountDeletionRequestsSchema from '@schemas/accountDeletionRequestsSchema'

const AccountDeletionRequestsSchema = new mongoose.Schema(
  accountDeletionRequestsSchema,
  { timestamps: true }
)

AccountDeletionRequestsSchema.index({ userId: 1, status: 1 })
AccountDeletionRequestsSchema.index({ tenantId: 1, requestedAt: -1 })

export default mongoose.models.AccountDeletionRequests ||
  mongoose.model('AccountDeletionRequests', AccountDeletionRequestsSchema)
