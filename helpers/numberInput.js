export const normalizeNumberInputString = (rawValue) => {
  const source = String(rawValue ?? '')
  if (!source) return ''

  const digits = source.replace(/\D/g, '')
  if (!digits) return ''

  return digits.replace(/^0+(?=\d)/, '')
}

export const toNormalizedNumber = (rawValue, options = {}) => {
  const { fallback = 0, min, max } = options
  const normalized = normalizeNumberInputString(rawValue)

  if (!normalized) return fallback

  let parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed)) return fallback

  if (typeof min === 'number' && parsed < min) parsed = min
  if (typeof max === 'number' && parsed > max) parsed = max

  return parsed
}

export const normalizeDecimalInputString = (rawValue, options = {}) => {
  const { maxFractionDigits = 2 } = options
  const fractionLimit = Math.max(0, Math.floor(maxFractionDigits))
  const source = String(rawValue ?? '')
    .trim()
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  if (!source) return ''

  const hasSeparator = source.includes('.')
  const [integerSource = '', ...fractionParts] = source.split('.')
  const hasDigits = /\d/.test(source)
  if (!hasDigits && !hasSeparator) return ''

  const integer =
    integerSource.replace(/^0+(?=\d)/, '') || (hasSeparator ? '0' : '')
  const fraction = fractionParts.join('').slice(0, fractionLimit)

  if (!hasSeparator || fractionLimit === 0) return integer
  return `${integer}.${fraction}`
}

const getFractionDigits = (value) => {
  const source = String(value)
  const separatorIndex = source.indexOf('.')
  return separatorIndex === -1 ? 0 : source.length - separatorIndex - 1
}

export const adjustNumberByStep = (rawValue, options = {}) => {
  const {
    step = 1,
    direction = 1,
    min,
    max,
    fractionDigits = getFractionDigits(step),
  } = options
  const precision = Math.max(0, Math.min(8, Math.floor(fractionDigits)))
  const factor = 10 ** precision
  const parsedValue = Number(String(rawValue ?? '').replace(',', '.'))
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0
  const stepUnits = Math.max(1, Math.round(Math.abs(Number(step)) * factor))
  let nextUnits =
    Math.round(safeValue * factor) + (direction < 0 ? -stepUnits : stepUnits)

  if (typeof min === 'number') {
    nextUnits = Math.max(nextUnits, Math.round(min * factor))
  }
  if (typeof max === 'number') {
    nextUnits = Math.min(nextUnits, Math.round(max * factor))
  }

  return nextUnits / factor
}
