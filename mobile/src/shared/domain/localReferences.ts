export const replaceLocalReference = (
  value: unknown,
  localId: string,
  serverId: string,
): unknown => {
  if (value === localId) return serverId
  if (Array.isArray(value)) {
    return value.map((item) => replaceLocalReference(item, localId, serverId))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      replaceLocalReference(item, localId, serverId),
    ]))
  }
  return value
}
