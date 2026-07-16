const toIso = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const serializeMobileDeviceSession = (session, currentSessionId) => ({
  _id: String(session?._id || ''),
  deviceName: String(session?.deviceName || ''),
  platform: String(session?.platform || 'android'),
  appVersion: String(session?.appVersion || ''),
  lastUsedAt: toIso(session?.lastUsedAt),
  createdAt: toIso(session?.createdAt),
  expiresAt: toIso(session?.expiresAt),
  current: String(session?._id || '') === String(currentSessionId || ''),
})
