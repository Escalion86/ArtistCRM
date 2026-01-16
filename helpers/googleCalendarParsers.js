const PHONE_REGEX = /((?:\+?7|8)(?:\D*\d){10})/g
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const CLIENT_NAME_REGEX = /(клиент|имя|заказчик)\s*[:\-]\s*(.+)/i
const COMMENT_REGEX = /(коммент|примечание|заметка|note)\s*[:\-]\s*(.+)/i
const CONTACT_LINK_REGEX =
  /(https?:\/\/t\.me\/\S+|t\.me\/\S+|https?:\/\/vk\.com\/\S+|vk\.com\/\S+)/gi

const sanitizeTextForAddress = (text = '') => {
  if (!text) return ''
  return text
    .replace(PHONE_REGEX, ' ')
    .replace(/\b(\d[\d\s.,]*)\s*(к|k|тыс|тыщ|т)\b/gi, ' ')
    .replace(/\b(задаток|сумма|стоимость|итого|оплата|аванс|предоплата)\b/gi, ' ')
    .replace(/\bруб\.?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const KNOWN_TOWNS = [
  'Красноярск',
  'Норильск',
  'Москва',
  'Дивногорск',
  'Сосновоборск',
  'Ульяновск',
  'Саранск',
  'Сочи',
  'Екатеринбург',
  'Канск',
  'Абакан',
  'Сорск',
  'Новосибирск',
]

const COORDS_REGEX = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i

const isUrl = (value) => /^https?:\/\//i.test(value)

const isValidTown = (value) => /[A-Za-zА-Яа-я]/.test(value ?? '')

const extractFlat = (text) => {
  if (!text) return { flat: '', rest: text }
  const match = text.match(/(?:кв\.?|квартира|оф\.?|офис)\s*([0-9A-Za-zА-Яа-я/-]+)/i)
  if (!match) return { flat: '', rest: text }
  const rest = text.replace(match[0], '').trim()
  return { flat: match[1] ?? '', rest }
}

const extractHouse = (text) => {
  if (!text) return { house: '', rest: text }
  const labeled = text.match(/(?:д\.?|дом)\s*([0-9A-Za-zА-Яа-я/-]+)/i)
  if (labeled) {
    const rest = text.replace(labeled[0], '').trim()
    return { house: labeled[1] ?? '', rest }
  }
  const trailing = text.match(/(.+?)\s+(\d+[0-9A-Za-zА-Яa-z/-]*)$/)
  if (trailing) {
    return { house: trailing[2] ?? '', rest: trailing[1].trim() }
  }
  const digitTokens = Array.from(text.matchAll(/\d+[0-9A-Za-zА-Яa-z/-]*/g))
  if (digitTokens.length > 0) {
    const lastToken = digitTokens[digitTokens.length - 1]?.[0]
    if (lastToken) {
      const rest = text.replace(lastToken, '').replace(/\s+/g, ' ').trim()
      return { house: lastToken, rest }
    }
  }
  return { house: '', rest: text }
}

const normalizeStreet = (value = '') =>
  value
    .replace(/\b(ул\.?|улица)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

const parseLocationToAddress = (location = '') => {
  const trimmed = location.trim()
  if (!trimmed) return {}
  if (trimmed.toLowerCase() === 'null') return {}

  const coordsMatch = trimmed.match(COORDS_REGEX)
  if (coordsMatch) {
    return {
      latitude: coordsMatch[1],
      longitude: coordsMatch[2],
    }
  }

  if (isUrl(trimmed)) {
    if (/2gis/i.test(trimmed)) return { link2Gis: trimmed }
    if (/yandex|yandexnavi/i.test(trimmed))
      return { linkYandexNavigator: trimmed }
  }

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const address = {}

  if (parts.length === 1) {
    if (!/\d/.test(parts[0])) {
      address.town = parts[0]
      return address
    }

    const { flat, rest } = extractFlat(parts[0])
    const { house, rest: street } = extractHouse(rest)
    if (street) address.street = normalizeStreet(street)
    if (house) address.house = house
    if (flat) address.flat = flat
    return address
  }

  const normalizedParts = parts.map((part) => part.toLowerCase())
  const townFromParts = KNOWN_TOWNS.find((town) =>
    normalizedParts.includes(town.toLowerCase())
  )
  if (townFromParts) address.town = townFromParts

  const filteredParts = parts.filter((part) => {
    const lower = part.toLowerCase()
    if (townFromParts && lower === townFromParts.toLowerCase()) return false
    if (/край|обл|область|россия/i.test(lower)) return false
    if (/^\d{6}$/.test(part)) return false
    return true
  })

  if (
    !address.town &&
    isValidTown(parts[0]) &&
    !/ул\.?|улица/i.test(parts[0])
  ) {
    address.town = parts[0]
  }

  const remainingParts = filteredParts.length
    ? filteredParts.filter((part) =>
        address.town ? part.toLowerCase() !== address.town.toLowerCase() : true
      )
    : parts.slice(1)
  const streetCandidate = remainingParts.find((part) =>
    /ул\.?|улица/i.test(part)
  )
  const houseCandidate =
    remainingParts.find((part) => /^\d/.test(part)) ?? ''
  const remaining = streetCandidate
    ? `${streetCandidate} ${houseCandidate}`.trim()
    : remainingParts.join(', ')
  const { flat, rest } = extractFlat(remaining)
  const { house, rest: street } = extractHouse(rest)
  if (street) address.street = normalizeStreet(street)
  if (house) address.house = house
  if (flat) address.flat = flat

  return address
}

const parseAddressFromText = (text = '') => {
  if (!text) return {}

  const normalizedText = sanitizeTextForAddress(text)
  if (!normalizedText) return {}
  const lowerText = normalizedText.toLowerCase()
  const town = KNOWN_TOWNS.find((candidate) =>
    lowerText.includes(candidate.toLowerCase())
  )
  if (!town) return {}

  const lastIndex = lowerText.lastIndexOf(town.toLowerCase())
  let rest = normalizedText.slice(lastIndex + town.length).trim()
  rest = rest.replace(/^[,.;:\s]+/, '').trim()

  if (!rest) return { town }

  const parts = rest.split(',').map((part) => part.trim()).filter(Boolean)
  const mainPart = parts[0] ?? ''
  const comment = parts.slice(1).join(', ')

  const { flat, rest: afterFlat } = extractFlat(mainPart)
  const { house, rest: streetRaw } = extractHouse(afterFlat)
  const normalizedStreet = normalizeStreet(streetRaw)
  let street = normalizedStreet
  let commentFromStreet = ''
  if (street && /\d/.test(street)) {
    const words = street.split(/\s+/).filter(Boolean)
    const lastWord = words[words.length - 1] ?? ''
    if (words.length > 1 && !/\d/.test(lastWord) && /^[A-ZА-ЯЁ]/.test(lastWord)) {
      commentFromStreet = lastWord
      street = words.slice(0, -1).join(' ')
    }
  }

  return {
    town,
    street: street || '',
    house: house || '',
    flat: flat || '',
    comment: comment || commentFromStreet || '',
  }
}

const normalizePhone = (value) => {
  if (!value) return ''
  const digits = String(value).replace(/[^\d]/g, '')
  if (digits.length < 11) return ''
  const normalized = digits.slice(0, 11)
  if (normalized.startsWith('8')) return `7${normalized.slice(1)}`
  if (normalized.startsWith('7')) return normalized
  return ''
}

const unique = (items) => Array.from(new Set(items.filter(Boolean)))

const AMOUNT_CANDIDATE_REGEX =
  /(\d[\d\s.,]*)(?:\s*(к|k|тыс|тыщ|т)(?![A-Za-zА-Яа-я])\.?)?/gi
const AMOUNT_CONTEXT_SKIP_AFTER_REGEX =
  /^\s*(этаж|каб\.?|кабинет|кв\.?|квартира|оф\.?|офис|подъезд|под\.?|дом|д\.?|стр\.?|строение|корп\.?|корпус|зал|класс|комната|км|лет|год|года|выход|выхода|мин|минут|час|часа)\b/i
const AMOUNT_CONTEXT_SKIP_BEFORE_REGEX =
  /(этаж|каб\.?|кабинет|кв\.?|квартира|оф\.?|офис|подъезд|под\.?|дом|д\.?|стр\.?|строение|корп\.?|корпус|зал|класс|комната|км|лет|год|года|выход|выхода|мин|минут|час|часа)\s*$/i
const ADDRESS_CONTEXT_LATIN_REGEX =
  /(russia|krasnoyarsk|krasnoyarskiy|kray|krai|oblast|region|street|ulitsa|prospekt|pr\-?t|avenue|ave|st\.?|str\.?|building|bldg|house|dom|office|of\.)/i
const TOTAL_AMOUNT_LABELS = [
  'сумма',
  'стоимость',
  'итого',
  'budget',
  'всего',
  'оплата',
  'гонорар',
  'договор',
  'цена',
  'к оплате',
]
const DEPOSIT_AMOUNT_LABELS = [
  'задаток',
  'предоплата',
  'депозит',
  'аванс',
  'бронь',
  'предопл',
]

const parseNumeric = (value) => {
  const normalized = value.replace(/\s+/g, '').replace(/,/g, '.')
  const numeric = Number.parseFloat(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

const parseAmountCandidate = (rawNumber, suffix) => {
  const digitsCount = (rawNumber.match(/\d/g) ?? []).length
  if (!suffix && digitsCount >= 9) return null // скорее всего телефон

  const numeric = parseNumeric(rawNumber)
  if (numeric === null) return null

  const multiplier = suffix ? 1000 : 1
  return numeric * multiplier
}

const sanitizeTextForAmounts = (text = '') =>
  text ? text.replace(PHONE_REGEX, ' ') : ''

const extractAmountCandidates = (text) => {
  if (!text) return []

  const amounts = []
  const sanitized = sanitizeTextForAmounts(text)
  const lines = sanitized.split(/\r?\n/)
  for (const line of lines) {
    if (!line) continue
    for (const match of line.matchAll(AMOUNT_CANDIDATE_REGEX)) {
      const [full, rawNumber, suffix] = match
      if (/%/.test(full)) continue

      const startIndex = match.index ?? 0
      const endIndex = startIndex + full.length
      const nextChar = line[endIndex] ?? ''
      const digitsCount = (rawNumber.match(/\d/g) ?? []).length
      const prevChar = line[startIndex - 1] ?? ''

      if (/[A-Za-zА-Яа-я]/.test(nextChar)) continue
      if ((suffix === 'к' || suffix === 'k') && /\d/.test(nextChar)) continue
      if (nextChar === '-' || prevChar === '-') continue

      const afterText = line.slice(endIndex, endIndex + 24)
      if (AMOUNT_CONTEXT_SKIP_AFTER_REGEX.test(afterText)) continue

      const beforeText = line.slice(Math.max(0, startIndex - 24), startIndex)
      if (AMOUNT_CONTEXT_SKIP_BEFORE_REGEX.test(beforeText)) continue
      if (!suffix && digitsCount === 6) {
        const addressContext = `${beforeText} ${afterText}`.toLowerCase()
        const hasTown = KNOWN_TOWNS.some((town) =>
          addressContext.includes(town.toLowerCase())
        )
        if (
          /(россия|край|обл|область|респ|республика|г\.|город|ул\.|улица|просп|пр\-т|пер\.|переулок|бул\.|бульвар|шоссе)/i.test(addressContext) ||
          ADDRESS_CONTEXT_LATIN_REGEX.test(addressContext) ||
          hasTown
        ) {
          continue
        }
      }

      const amount = parseAmountCandidate(rawNumber, suffix)
      if (amount !== null) amounts.push(amount)
    }
  }

  return amounts
}

const findAmountByLabels = (text, labels) => {
  if (!text) return null

  const labelsRegex = new RegExp(`(?:${labels.join('|')})`, 'ig')
  const sanitized = sanitizeTextForAmounts(text)
  for (const labelMatch of sanitized.matchAll(labelsRegex)) {
    const context = sanitized.slice(
      labelMatch.index ?? 0,
      (labelMatch.index ?? 0) + 120
    )
    const [amount] = extractAmountCandidates(context)
    if (amount !== undefined) return amount
  }

  return null
}

const detectCurrency = (text) => {
  if (!text) return null
  if (/₽|руб\.?|r\b|rub/i.test(text)) return 'RUB'
  if (/\$|usd/i.test(text)) return 'USD'
  if (/€|eur/i.test(text)) return 'EUR'
  return null
}

const detectDepositStatus = (chunk) => {
  if (!chunk) return null
  if (/оплач|получ|внес|перечисл/i.test(chunk)) return 'paid'
  if (/ожида|не оплач|нет|должен|ждем/i.test(chunk)) return 'pending'
  return null
}

const detectDepositStatusByMarkers = (summary) => {
  if (!summary) return null
  if (/❗❗/.test(summary)) return 'paid'
  if (/❗/.test(summary)) return 'deposit_paid'
  if (/❕/.test(summary)) return 'confirmed'
  return null
}

const detectTransferred = (summary, description) => {
  const text = `${summary ?? ''}\n${description ?? ''}`
  if (/передан|передано|передача|передал/i.test(text)) return true
  if (/коллег/i.test(text)) return true
  return false
}

const extractClientNameFromDescription = (description = '') => {
  const lines = description.split(/\r?\n/).map((line) => line.trim())
  const labelsRegex = new RegExp(
    `(?:${TOTAL_AMOUNT_LABELS.join('|')}|${DEPOSIT_AMOUNT_LABELS.join('|')})`,
    'i'
  )

  for (const line of lines) {
    if (!line) continue
    if (!/[A-Za-zА-Яа-я]/.test(line)) continue
    if (/\d/.test(line)) continue
    if (labelsRegex.test(line)) continue
    if (/коммент|примечание|заметка|note/i.test(line)) continue
    return line
  }

  return ''
}

const isDescriptionOnlyAmountsOrPhones = (description = '') => {
  if (!description) return false

  const cleaned = description
    .replace(PHONE_REGEX, ' ')
    .replace(CONTACT_LINK_REGEX, ' ')
    .replace(AMOUNT_CANDIDATE_REGEX, ' ')
    .replace(/\b(руб\.?|r\b|rub|usd|eur|тыс|тыщ|к|k|т)\b/gi, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[\s.,:;()\-+]+/g, ' ')
    .trim()

  if (/[A-Za-zА-Яа-я]/.test(cleaned)) return false

  const hasPhones = new RegExp(PHONE_REGEX.source).test(description)
  const hasAmounts = (description.match(AMOUNT_CANDIDATE_REGEX) ?? []).length > 0

  return hasPhones || hasAmounts
}

const pickClientName = (summary, description, attendees) => {
  const descriptionMatch = description.match(CLIENT_NAME_REGEX)
  if (descriptionMatch?.[2]) return descriptionMatch[2].trim()

  const possibleName = extractClientNameFromDescription(description)
  if (possibleName) return possibleName

  const attendeeName = attendees.find((attendee) => attendee?.displayName)?.displayName
  if (attendeeName) return attendeeName.trim()

  if (!isDescriptionOnlyAmountsOrPhones(description) && summary?.trim())
    return summary.trim()

  return 'Мероприятие из календаря'
}

export const parseGoogleEvent = (event) => {
  const description = event?.description ?? ''
  const summary = event?.summary ?? ''
  const isCharity = /благотвор/i.test(`${summary}\n${description}`)
  const attendees = Array.isArray(event?.attendees) ? event.attendees : []
  const rawLocation = event?.location ?? ''

  const descriptionPhones = unique((description.match(PHONE_REGEX) ?? []).map(normalizePhone))
  const locationPhones = unique(
    (rawLocation.match(PHONE_REGEX) ?? []).map(normalizePhone)
  )
  const phones = unique([...descriptionPhones, ...locationPhones])

  const emails = unique(description.match(EMAIL_REGEX) ?? [])
  const attendeeEmails = unique(
    attendees.map((attendee) => attendee?.email).filter(Boolean)
  )

  const allAmounts = extractAmountCandidates(
    `${description}\n${summary}\n${rawLocation}`
  )

  const totalAmountByLabel =
    findAmountByLabels(description, TOTAL_AMOUNT_LABELS) ??
    findAmountByLabels(summary, TOTAL_AMOUNT_LABELS)

  const depositAmountByLabel =
    findAmountByLabels(description, DEPOSIT_AMOUNT_LABELS) ??
    findAmountByLabels(summary, DEPOSIT_AMOUNT_LABELS)

  const amountsWithoutDeposit =
    depositAmountByLabel !== null
      ? allAmounts.filter((amount) => amount !== depositAmountByLabel)
      : []

  let totalAmount =
    totalAmountByLabel ??
    (amountsWithoutDeposit.length ? Math.max(...amountsWithoutDeposit) : null) ??
    (allAmounts.length ? Math.max(...allAmounts) : null)

  let depositAmount = depositAmountByLabel

  const depositStatusMarker = detectDepositStatusByMarkers(summary)

  if (!depositAmount && depositStatusMarker && allAmounts.length > 1) {
    const candidates = allAmounts.filter((amount) => amount !== totalAmount)
    if (candidates.length) depositAmount = Math.min(...candidates)
  }

  const depositStatus =
    depositAmount || depositStatusMarker
      ?
          depositStatusMarker ||
          detectDepositStatus(description) ||
          detectDepositStatus(summary) ||
          'unknown'
      : null

  const currency =
    detectCurrency(description) || detectCurrency(summary) || (totalAmount ? 'RUB' : null)

  if (isCharity) {
    totalAmount = 0
    depositAmount = null
  }

  const commentMatch = description.match(COMMENT_REGEX)

  const clientName = pickClientName(summary, description, attendees)
  const clientPhone = phones[0] ?? ''

  const timeStart = event?.start?.dateTime ?? event?.start?.date ?? null
  const timeEnd = event?.end?.dateTime ?? event?.end?.date ?? null

  const dateStart = timeStart ? new Date(timeStart) : null
  const dateEnd = timeEnd ? new Date(timeEnd) : null
  const eventDate = dateStart ?? dateEnd ?? null

  const contactChannels = unique([
    ...emails,
    ...attendeeEmails,
    ...(clientPhone ? [`+${clientPhone}`] : []),
    ...(description.match(CONTACT_LINK_REGEX) ?? []),
  ])

  const clientData = {}
  if (currency) clientData.currency = currency
  const depositDate = dateStart ?? eventDate ?? dateEnd ?? null

  if (!isCharity && (depositAmount !== null || depositStatus))
    clientData.deposit = {
      amount: depositAmount ?? null,
      status: depositStatus ?? 'unknown',
      date: depositDate,
    }

  const isTransferred = detectTransferred(summary, description)

  const locationAddress = parseLocationToAddress(rawLocation)
  const textAddress = parseAddressFromText(
    `${summary}\n${description ?? ''}`
  )
  const address = {
    ...locationAddress,
    ...textAddress,
  }

  return {
    description: description.trim(),
    address,
    clientName,
    clientPhone,
    contactChannels,
    dateStart,
    dateEnd,
    eventDate,
    contractSum: isCharity ? 0 : totalAmount,
    comment: commentMatch?.[2]?.trim() ?? '',
    status:
      event?.status === 'cancelled' || /отмена/i.test(summary)
        ? 'canceled'
        : 'active',
    clientData,
    isTransferred,
  }
}
