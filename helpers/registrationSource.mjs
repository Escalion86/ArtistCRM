export const REGISTRATION_SOURCE_COOKIE = 'artistcrm_registration_source'
export const ACQUISITION_COOKIE = 'artistcrm_acquisition'
export const REGISTRATION_SOURCE_COOKIE_MAX_AGE = 90 * 24 * 60 * 60

const REGISTRATION_SOURCE_MAX_LENGTH = 64
const REGISTRATION_SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
const ATTRIBUTION_VALUE_MAX_LENGTH = 160
const ATTRIBUTION_PATH_MAX_LENGTH = 240
const UNSAFE_ATTRIBUTION_CHARACTERS = /[\u0000-\u001f\u007f<>"'`]/g

const normalizeAttributionValue = (value, maxLength = ATTRIBUTION_VALUE_MAX_LENGTH) => {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(UNSAFE_ATTRIBUTION_CHARACTERS, '')
    .slice(0, maxLength)
}

export const normalizeAcquisition = (value = {}) => {
  if (!value || typeof value !== 'object') return null
  const acquisition = {
    source: normalizeAttributionValue(value.source).toLowerCase(),
    medium: normalizeAttributionValue(value.medium).toLowerCase(),
    campaign: normalizeAttributionValue(value.campaign),
    content: normalizeAttributionValue(value.content),
    term: normalizeAttributionValue(value.term),
    yclid: normalizeAttributionValue(value.yclid),
    landingPath: normalizeAttributionValue(
      value.landingPath,
      ATTRIBUTION_PATH_MAX_LENGTH
    ),
  }
  return Object.values(acquisition).some(Boolean) ? acquisition : null
}

export const buildAcquisitionFromSearchParams = ({
  searchParams,
  source = '',
  landingPath = '/',
} = {}) =>
  normalizeAcquisition({
    source: source || searchParams?.get?.('utm_source') || '',
    medium: searchParams?.get?.('utm_medium') || '',
    campaign: searchParams?.get?.('utm_campaign') || '',
    content: searchParams?.get?.('utm_content') || '',
    term: searchParams?.get?.('utm_term') || '',
    yclid: searchParams?.get?.('yclid') || '',
    landingPath,
  })

export const serializeAcquisitionCookie = (value) => {
  const normalized = normalizeAcquisition(value)
  return normalized ? encodeURIComponent(JSON.stringify(normalized)) : ''
}

export const parseAcquisitionCookie = (value) => {
  if (typeof value !== 'string' || !value || value.length > 2048) return null
  try {
    return normalizeAcquisition(JSON.parse(decodeURIComponent(value)))
  } catch {
    return null
  }
}

export const normalizeRegistrationSource = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized.length > REGISTRATION_SOURCE_MAX_LENGTH) {
    return ''
  }
  return REGISTRATION_SOURCE_PATTERN.test(normalized) ? normalized : ''
}

export const getUserRegistrationSource = (user) =>
  normalizeRegistrationSource(user?.registrationSource) ||
  normalizeRegistrationSource(user?.acquisition?.source)

export const getRegistrationSourceFromRequest = (request) =>
  normalizeRegistrationSource(
    request?.cookies?.get?.(REGISTRATION_SOURCE_COOKIE)?.value
  )

export const getAcquisitionFromRequest = (request) =>
  parseAcquisitionCookie(request?.cookies?.get?.(ACQUISITION_COOKIE)?.value)

export const formatRegistrationSource = (value) =>
  normalizeRegistrationSource(value) || 'Без метки'
