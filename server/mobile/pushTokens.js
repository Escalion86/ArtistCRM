export const normalizePushDeviceId = (value) =>
  String(value || '').trim().slice(0, 200)

export const buildStalePushTokenFilter = ({ tenantId, deviceId, pushToken }) => {
  const normalizedDeviceId = normalizePushDeviceId(deviceId)
  if (!tenantId || !normalizedDeviceId || !pushToken) return null
  return {
    tenantId,
    deviceId: normalizedDeviceId,
    isActive: true,
    pushToken: { $ne: pushToken },
  }
}

export const buildPushTokenDeactivationFilter = ({
  tenantId,
  pushToken,
  deviceId,
}) => {
  if (!tenantId || !pushToken) return null
  const filter = { tenantId, pushToken }
  const normalizedDeviceId = normalizePushDeviceId(deviceId)
  if (normalizedDeviceId) filter.deviceId = normalizedDeviceId
  return filter
}

export const persistDevicePushToken = async ({
  model,
  tenantId,
  pushToken,
  deviceId,
  platform = '',
  appVersion = '',
}) => {
  const normalizedDeviceId = normalizePushDeviceId(deviceId)
  const saved = await model.findOneAndUpdate(
    { tenantId, pushToken },
    {
      $set: {
        tenantId,
        pushToken,
        deviceId: normalizedDeviceId,
        platform: ['android', 'ios'].includes(platform) ? platform : '',
        appVersion: String(appVersion || '').slice(0, 50),
        isActive: true,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )
  const staleFilter = buildStalePushTokenFilter({
    tenantId,
    deviceId: normalizedDeviceId,
    pushToken,
  })
  if (staleFilter) {
    await model.updateMany(staleFilter, { $set: { isActive: false } })
  }
  return saved
}
