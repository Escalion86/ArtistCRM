export const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000

export const buildTombstoneUpdate = ({ tenantId, version, now = new Date() }) => ({
  $set: {
    deletedAt: now,
    purgeAt: new Date(now.getTime() + TOMBSTONE_TTL_MS),
  },
  $max: { version: Math.max(1, Number(version || 1) + 1) },
  $setOnInsert: { tenantId },
})
