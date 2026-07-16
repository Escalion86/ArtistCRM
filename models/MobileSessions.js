import mongoose from 'mongoose'
import mobileSessionsSchema from '@schemas/mobileSessionsSchema'

const MobileSessionsSchema = new mongoose.Schema(mobileSessionsSchema, {
  timestamps: true,
})

MobileSessionsSchema.index({ refreshTokenHash: 1 }, { unique: true })
MobileSessionsSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 })
MobileSessionsSchema.index({ tenantId: 1, deviceId: 1 })
MobileSessionsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.MobileSessions ||
  mongoose.model('MobileSessions', MobileSessionsSchema)
