export const SYNC_STREAMS = [
  'events',
  'clients',
  'transactions',
  'services',
  'serviceGroups',
  'tombstones',
]

const EPOCH = new Date(0)
const CURSOR_PREFIX = 'v1.'

const validDate = (value, fallback) => {
  const date = value ? new Date(value) : fallback
  return Number.isNaN(date.getTime()) ? fallback : date
}

const initialPositions = (at) => Object.fromEntries(
  SYNC_STREAMS.map((stream) => [stream, { at: at.toISOString(), id: '' }])
)

export const parseSyncCursor = (value, now = new Date()) => {
  const safeNow = validDate(now, new Date())
  if (!value?.startsWith?.(CURSOR_PREFIX)) {
    const legacy = validDate(value, EPOCH)
    const at = legacy > safeNow ? safeNow : legacy
    return { upperBound: safeNow, positions: initialPositions(at) }
  }

  try {
    const raw = JSON.parse(Buffer.from(value.slice(CURSOR_PREFIX.length), 'base64url'))
    const requestedUpperBound = validDate(raw?.upperBound, safeNow)
    const upperBound = requestedUpperBound > safeNow ? safeNow : requestedUpperBound
    const positions = Object.fromEntries(SYNC_STREAMS.map((stream) => {
      const rawPosition = raw?.positions?.[stream]
      const requestedAt = validDate(rawPosition?.at, EPOCH)
      const at = requestedAt > upperBound ? upperBound : requestedAt
      const id = String(rawPosition?.id || '').slice(0, 128)
      return [stream, { at: at.toISOString(), id }]
    }))
    return { upperBound, positions }
  } catch {
    return { upperBound: safeNow, positions: initialPositions(EPOCH) }
  }
}

export const encodeSyncCursor = ({ upperBound, positions }) => {
  const payload = JSON.stringify({
    upperBound: upperBound.toISOString(),
    positions,
  })
  return `${CURSOR_PREFIX}${Buffer.from(payload).toString('base64url')}`
}

export const buildSyncPageQuery = ({ tenantId, position, upperBound, dateField }) => {
  const after = validDate(position?.at, EPOCH)
  const id = String(position?.id || '')
  if (!id) {
    return {
      tenantId,
      [dateField]: { $gt: after, $lte: upperBound },
    }
  }
  return {
    tenantId,
    $and: [
      { [dateField]: { $lte: upperBound } },
      {
        $or: [
          { [dateField]: { $gt: after } },
          { [dateField]: after, _id: { $gt: id } },
        ],
      },
    ],
  }
}

export const advanceSyncPosition = (items, dateField, previous) => {
  const last = items.at(-1)
  if (!last) return previous
  return {
    at: validDate(last[dateField], validDate(previous?.at, EPOCH)).toISOString(),
    id: String(last._id || ''),
  }
}
