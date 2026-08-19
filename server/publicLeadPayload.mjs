const PUBLIC_LEAD_RAW_LIMITS = Object.freeze({
  maxDepth: 4,
  maxArrayItems: 50,
  maxObjectKeys: 50,
  maxKeyLength: 100,
  maxStringLength: 4000,
  maxTotalCharacters: 32_000,
})

const SENSITIVE_RAW_PAYLOAD_KEY =
  /api[_-]?key|token|secret|password|authorization/i
const UNSAFE_RAW_PAYLOAD_KEY = /^(?:\$|__proto__$|prototype$|constructor$)|\./

const takeStringWithinBudget = (value, state) => {
  if (state.remaining <= 0) return ''
  const maxLength = Math.min(
    PUBLIC_LEAD_RAW_LIMITS.maxStringLength,
    state.remaining
  )
  const result = String(value).slice(0, maxLength)
  state.remaining -= result.length
  return result
}

const sanitizeValue = (value, depth, state) => {
  if (depth > PUBLIC_LEAD_RAW_LIMITS.maxDepth || state.remaining <= 0) {
    return null
  }
  if (typeof value === 'string') return takeStringWithinBudget(value, state)
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    state.remaining -= Math.min(String(value).length, state.remaining)
    return value
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, PUBLIC_LEAD_RAW_LIMITS.maxArrayItems)
      .map((item) => sanitizeValue(item, depth + 1, state))
  }
  if (!value || typeof value !== 'object') return null

  const result = {}
  const entries = Object.entries(value).slice(
    0,
    PUBLIC_LEAD_RAW_LIMITS.maxObjectKeys
  )
  for (const [rawKey, item] of entries) {
    if (state.remaining <= 0) break
    const key = String(rawKey).slice(0, PUBLIC_LEAD_RAW_LIMITS.maxKeyLength)
    if (
      !key ||
      SENSITIVE_RAW_PAYLOAD_KEY.test(key) ||
      UNSAFE_RAW_PAYLOAD_KEY.test(key)
    ) {
      continue
    }
    state.remaining -= Math.min(key.length, state.remaining)
    result[key] = sanitizeValue(item, depth + 1, state)
  }
  return result
}

const sanitizeRawPayload = (value) =>
  sanitizeValue(value, 0, {
    remaining: PUBLIC_LEAD_RAW_LIMITS.maxTotalCharacters,
  })

const normalizePublicLeadText = (value, maxLength) => {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

const buildPublicLeadAddress = ({ town, address }) => ({
  town: normalizePublicLeadText(town, 120),
  street: '',
  house: '',
  entrance: '',
  floor: '',
  flat: '',
  comment: normalizePublicLeadText(address, 500),
  latitude: '',
  longitude: '',
  link2Gis: '',
  linkYandexNavigator: '',
  link2GisShow: true,
  linkYandexShow: true,
})

const buildPublicLeadInitialContactEvent = (requestCreatedAt) => ({
  title: 'Связаться с клиентом',
  description: '',
  date: requestCreatedAt,
  done: false,
  doneAt: null,
  googleCalendarEventId: '',
})

export {
  PUBLIC_LEAD_RAW_LIMITS,
  buildPublicLeadAddress,
  buildPublicLeadInitialContactEvent,
  sanitizeRawPayload,
}
