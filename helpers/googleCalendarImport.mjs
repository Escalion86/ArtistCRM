export const GOOGLE_IMPORT_MAX_DAYS = 366
export const GOOGLE_IMPORT_MAX_EVENTS = 100
export const GOOGLE_IMPORT_BATCH_SIZE = 10

const toDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const normalizeGoogleImportRange = (timeMin, timeMax) => {
  const from = toDate(timeMin)
  const to = toDate(timeMax)
  if (!from || !to) throw new Error('Укажите корректный период импорта')
  if (from.getTime() >= to.getTime()) {
    throw new Error('Дата начала должна быть раньше даты окончания')
  }
  const days = (to.getTime() - from.getTime()) / 86_400_000
  if (days > GOOGLE_IMPORT_MAX_DAYS) {
    throw new Error(`За один раз можно выбрать не более ${GOOGLE_IMPORT_MAX_DAYS} дней`)
  }
  return { timeMin: from.toISOString(), timeMax: to.toISOString(), days }
}

export const isGoogleImportCanceled = (item) =>
  item?.status === 'cancelled' || /\(отменено\)|отмен/i.test(item?.summary ?? '')

export const getGoogleImportSourceText = (item) =>
  [item?.summary, item?.description]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join('\n')

export const getGoogleImportStart = (item) =>
  item?.start?.dateTime ?? item?.start?.date ?? null

export const getGoogleImportEnd = (item) =>
  item?.end?.dateTime ?? item?.end?.date ?? null

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

const localDateAtNoonToIso = (dateValue, timeZone) => {
  const [year, month, day] = String(dateValue).split('-').map(Number)
  const wallClockUtc = Date.UTC(year, month - 1, day, 12, 0, 0)
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
  return new Date(result)
}

export const getGoogleImportDates = (
  item,
  { timeZone = 'Asia/Krasnoyarsk', defaultDurationMinutes = 60 } = {}
) => {
  const allDay = Boolean(item?.start?.date && !item?.start?.dateTime)
  if (allDay) {
    const eventDate = localDateAtNoonToIso(item.start.date, timeZone)
    return {
      eventDate,
      dateEnd: new Date(
        eventDate.getTime() + Math.max(15, defaultDurationMinutes) * 60_000
      ),
      allDay: true,
    }
  }
  const eventDate = toDate(item?.start?.dateTime)
  const dateEnd = toDate(item?.end?.dateTime) ?? eventDate
  return { eventDate, dateEnd, allDay: false }
}

export const serializeGoogleImportCandidate = (
  item,
  { alreadyImported = false } = {}
) => ({
  id: String(item?.id ?? ''),
  title: String(item?.summary || 'Без названия').slice(0, 240),
  eventDate: getGoogleImportStart(item),
  dateEnd: getGoogleImportEnd(item),
  allDay: Boolean(item?.start?.date && !item?.start?.dateTime),
  location: String(item?.location ?? '').trim().slice(0, 500),
  descriptionPreview: String(item?.description ?? '').trim().slice(0, 300),
  needsAi: Boolean(String(item?.description ?? '').trim()),
  alreadyImported,
  canceled: isGoogleImportCanceled(item),
})

const hasAddressValues = (address) =>
  address &&
  Object.values(address).some(
    (value) => typeof value === 'string' && value.trim()
  )

export const chooseGoogleImportAddress = ({
  calendarLocation,
  calendarAddress,
  aiAddress,
  fallbackAddress,
}) => {
  if (String(calendarLocation ?? '').trim() && hasAddressValues(calendarAddress)) {
    return calendarAddress
  }
  if (hasAddressValues(aiAddress)) return aiAddress
  if (hasAddressValues(fallbackAddress)) return fallbackAddress
  return {}
}

const ALLOWED_AI_FIELDS = new Set([
  'eventType',
  'description',
  'contractSum',
  'waitDeposit',
  'depositExpectedAmount',
  'isByContract',
  'financeComment',
  'address',
  'clientId',
  'clientName',
  'clientPhone',
  'clientWhatsapp',
  'clientViber',
  'clientEmail',
  'clientTelegram',
  'clientInstagram',
  'clientVk',
  'servicesIds',
])

export const normalizeGoogleImportAiFields = (
  value,
  validServiceIds = []
) => {
  const source = value && typeof value === 'object' ? value : {}
  const fields = {}
  Object.entries(source).forEach(([key, fieldValue]) => {
    if (!ALLOWED_AI_FIELDS.has(key)) return
    fields[key] = fieldValue
  })

  if (Array.isArray(fields.servicesIds)) {
    const allowedIds = new Set(validServiceIds.map(String))
    fields.servicesIds = Array.from(
      new Set(
        fields.servicesIds
          .map((item) => String(item ?? '').trim())
          .filter((item) => allowedIds.has(item))
      )
    )
  } else {
    delete fields.servicesIds
  }

  if (typeof fields.eventType === 'string') {
    fields.eventType = fields.eventType.trim().slice(0, 100)
  } else {
    delete fields.eventType
  }
  ;['description', 'financeComment', 'clientName'].forEach((key) => {
    if (typeof fields[key] === 'string') fields[key] = fields[key].trim()
    else delete fields[key]
  })
  ;['contractSum', 'depositExpectedAmount'].forEach((key) => {
    if (fields[key] === null || fields[key] === undefined || fields[key] === '') {
      delete fields[key]
      return
    }
    const numeric = Number(fields[key])
    if (Number.isFinite(numeric) && numeric >= 0) fields[key] = numeric
    else delete fields[key]
  })
  ;['waitDeposit', 'isByContract'].forEach((key) => {
    if (typeof fields[key] !== 'boolean') delete fields[key]
  })

  if (!fields.address || typeof fields.address !== 'object') {
    delete fields.address
  }
  return fields
}

export const getGoogleImportEstimateRub = (count, costPerEventRub) =>
  Math.round(
    Math.max(0, Number(count) || 0) *
      Math.max(0, Number(costPerEventRub) || 0) *
      100
  ) / 100
