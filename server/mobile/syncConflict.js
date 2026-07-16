export const withSyncVersionIncrement = (update = {}) => ({
  ...update,
  $inc: {
    ...(update.$inc || {}),
    syncVersion: 1,
  },
})

export const findConflictingFields = ({ current, patch, baseValues }) => {
  if (!current || !patch || !baseValues) return []
  const conflicts = []
  for (const [path, localValue] of Object.entries(patch)) {
    if (!Object.prototype.hasOwnProperty.call(baseValues, path)) continue
    const baseValue = baseValues[path]
    const remoteValue = current[path]
    if (
      JSON.stringify(remoteValue) !== JSON.stringify(baseValue) &&
      JSON.stringify(remoteValue) !== JSON.stringify(localValue)
    ) {
      conflicts.push({ path, base: baseValue, local: localValue, remote: remoteValue })
    }
  }
  return conflicts
}
