const rateLimitCountersSchema = {
  scope: {
    type: String,
    required: true,
    trim: true,
  },
  keyHash: {
    type: String,
    required: true,
    trim: true,
  },
  windowStart: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
}

export default rateLimitCountersSchema
