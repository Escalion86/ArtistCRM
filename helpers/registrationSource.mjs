export const REGISTRATION_SOURCE_COOKIE = 'artistcrm_registration_source'
export const REGISTRATION_SOURCE_COOKIE_MAX_AGE = 90 * 24 * 60 * 60

const REGISTRATION_SOURCE_MAX_LENGTH = 64
const REGISTRATION_SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

export const normalizeRegistrationSource = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized.length > REGISTRATION_SOURCE_MAX_LENGTH) {
    return ''
  }
  return REGISTRATION_SOURCE_PATTERN.test(normalized) ? normalized : ''
}

export const getRegistrationSourceFromRequest = (request) =>
  normalizeRegistrationSource(
    request?.cookies?.get?.(REGISTRATION_SOURCE_COOKIE)?.value
  )

export const formatRegistrationSource = (value) =>
  normalizeRegistrationSource(value) || 'Без метки'
