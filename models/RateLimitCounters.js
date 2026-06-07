import mongoose from 'mongoose'
import rateLimitCountersSchema from '@schemas/rateLimitCountersSchema'

const RateLimitCountersSchema = new mongoose.Schema(rateLimitCountersSchema, {
  timestamps: true,
})

RateLimitCountersSchema.index(
  { scope: 1, keyHash: 1, windowStart: 1 },
  { unique: true }
)
RateLimitCountersSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.RateLimitCounters ||
  mongoose.model('RateLimitCounters', RateLimitCountersSchema)
