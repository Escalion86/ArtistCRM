export const normalizeMobileDevice = (device = {}) => ({
  deviceId: String(device?.deviceId || '').slice(0, 200),
  deviceName: String(device?.deviceName || '').slice(0, 200),
  platform: String(device?.platform || 'android').slice(0, 50),
  appVersion: String(device?.appVersion || '').slice(0, 50),
})

export const findActiveMobileSessionByRefreshHash = ({ model, refreshTokenHash, now }) =>
  model.findOne({
    refreshTokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  }).lean()

export const findMobileSessionByRefreshHash = ({ model, refreshTokenHash }) => {
  if (!refreshTokenHash) return null
  return model.findOne({ refreshTokenHash })
    .select('userId tenantId deviceId revokedAt expiresAt')
    .lean()
}

export const rotateMobileSessionToken = ({
  model,
  sessionId,
  expectedRefreshTokenHash,
  nextRefreshTokenHash,
  device,
  now,
}) => model.findOneAndUpdate(
  {
    _id: sessionId,
    refreshTokenHash: expectedRefreshTokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  },
  {
    $set: {
      refreshTokenHash: nextRefreshTokenHash,
      lastUsedAt: now,
      ...normalizeMobileDevice(device),
    },
  },
  { returnDocument: 'after' }
).lean()

export const revokeMobileSessionRecord = async ({
  model,
  refreshTokenHash,
  sessionId,
  userId,
  now = new Date(),
}) => {
  const query = { revokedAt: null }
  if (refreshTokenHash) query.refreshTokenHash = refreshTokenHash
  else if (sessionId) query._id = sessionId
  else return false
  if (userId) query.userId = userId

  const result = await model.updateOne(query, { $set: { revokedAt: now } })
  return result.modifiedCount > 0
}

export const revokeAllMobileSessionRecords = ({ model, userId, now = new Date() }) =>
  model.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: now } }
  )

export const listActiveMobileSessionRecords = ({ model, userId, now = new Date() }) =>
  model.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: now },
  })
    .select('deviceId deviceName platform appVersion lastUsedAt createdAt expiresAt')
    .sort({ lastUsedAt: -1 })
    .lean()

export const findAuthorizedMobileSession = ({ model, sessionId, userId, now }) =>
  model.findOne({
    _id: sessionId,
    userId,
    revokedAt: null,
    expiresAt: { $gt: now },
  }).lean()
