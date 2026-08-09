const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'

const getZonedParts = (value, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  )
}

const localDateTimeToIso = ({ year, month, day, hour, minute }, timeZone) => {
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let result = wallClockUtc

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const zoned = getZonedParts(new Date(result), timeZone)
    const representedUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second
    )
    result += wallClockUtc - representedUtc
  }

  return new Date(result).toISOString()
}

export const getAiDraftToday = (
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE
) => {
  const parts = getZonedParts(now, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day
  ).padStart(2, '0')}`
}

const getRelativeDayOffset = (text) => {
  if (/(?:^|[^а-яё])послезавтра(?:$|[^а-яё])/i.test(text)) return 2
  if (/(?:^|[^а-яё])завтра(?:$|[^а-яё])/i.test(text)) return 1
  if (/(?:^|[^а-яё])сегодня(?:$|[^а-яё])/i.test(text)) return 0
  return null
}

const getExplicitTime = (text) => {
  const match = String(text ?? '').match(
    /(?:^|\s)(?:в|к|начало\s*(?:в)?)\s*([01]?\d|2[0-3])(?:[.:]([0-5]\d))?(?=$|\s|[,.!?;])/i
  )
  if (!match) return null
  return {
    hour: Number(match[1]),
    minute: Number(match[2] ?? 0),
  }
}

const getRelativeEventDate = (text, { now, timeZone }) => {
  const offset = getRelativeDayOffset(text)
  if (offset === null) return null

  const current = getZonedParts(now, timeZone)
  const targetDate = new Date(
    Date.UTC(current.year, current.month - 1, current.day + offset)
  )
  const explicitTime = getExplicitTime(text)

  return localDateTimeToIso(
    {
      year: targetDate.getUTCFullYear(),
      month: targetDate.getUTCMonth() + 1,
      day: targetDate.getUTCDate(),
      hour: explicitTime?.hour ?? 12,
      minute: explicitTime?.minute ?? 0,
    },
    timeZone
  )
}

const EVENT_TYPE_RULES = [
  { pattern: /(?:свадьб[а-яё]*|свадебн[а-яё]*)/i, value: 'Свадьба' },
  { pattern: /корпоратив[а-яё]*/i, value: 'Корпоратив' },
  { pattern: /(?:день\s+рождени[а-яё]*|(?:^|\s)др(?:$|\s))/i, value: 'День рождения' },
  { pattern: /юбиле[а-яё]*/i, value: 'Юбилей' },
  { pattern: /выпускн[а-яё]*/i, value: 'Выпускной' },
  { pattern: /детск[а-яё]*\s+праздник[а-яё]*/i, value: 'Детский праздник' },
]

const getEventTypeHint = (text) =>
  EVENT_TYPE_RULES.find((rule) => rule.pattern.test(text))?.value ?? ''

const normalizeStreetName = (value) => {
  const source = String(value ?? '').trim()
  if (!source) return ''
  const nominative = /ой$/i.test(source)
    ? `${source.slice(0, -2)}ая`
    : source
  return `${nominative.charAt(0).toLocaleUpperCase('ru-RU')}${nominative.slice(1)}`
}

const getAddressHint = (text) => {
  const source = String(text ?? '')
  const labeled = source.match(
    /(?:ул\.?|улиц(?:а|е|у|ы))\s+([а-яёa-z-]+)\s*,?\s*(?:д\.?|дом)?\s*(\d+[а-яёa-z\/-]*)/i
  )
  const conversational = source.match(
    /(?:^|\s)на\s+([а-яёa-z-]+)\s*,?\s*(?:д\.?|дом)?\s*(\d+[а-яёa-z\/-]*)(?=$|\s|[,.!?;])/i
  )
  const match = labeled || conversational
  if (!match) return null

  return {
    street: normalizeStreetName(match[1]),
    house: match[2],
  }
}

export const hasAiDraftMoneyEvidence = (text) =>
  /(?:₽|руб(?:л(?:ей|я|ь))?\.?|тыс(?:яч[аиу]?)?\.?|\d\s*[кk]\b|бюджет|гонорар|стоимост|цена|сумма|оплата)/i.test(
    String(text ?? '')
  )

export const getAiEventDraftHints = (
  text,
  { now = new Date(), timeZone = DEFAULT_TIME_ZONE } = {}
) => {
  const hints = {}
  const eventType = getEventTypeHint(text)
  const eventDate = getRelativeEventDate(text, { now, timeZone })
  const address = getAddressHint(text)

  if (eventType) hints.eventType = eventType
  if (eventDate) hints.eventDate = eventDate
  if (address) hints.address = address

  return hints
}

export const applyAiEventDraftHints = (fields, text, options = {}) => {
  const result = { ...(fields ?? {}) }
  const hints = getAiEventDraftHints(text, options)

  if (!hasAiDraftMoneyEvidence(text)) {
    delete result.contractSum
    delete result.depositExpectedAmount
  }

  if (hints.eventType) result.eventType = hints.eventType
  if (hints.eventDate) result.eventDate = hints.eventDate
  if (hints.address) {
    result.address = { ...(result.address ?? {}), ...hints.address }
  }

  return result
}
