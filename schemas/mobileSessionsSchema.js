import { Schema } from 'mongoose'

const mobileSessionsSchema = {
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
  },
  deviceId: { type: String, default: '' },
  deviceName: { type: String, default: '' },
  platform: { type: String, default: 'android' },
  appVersion: { type: String, default: '' },
  lastUsedAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  googleOAuthStateHash: { type: String, default: '' },
  googleOAuthStateExpiresAt: { type: Date, default: null },
}

export default mobileSessionsSchema
