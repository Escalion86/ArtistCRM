const PHONE_REGEX = /(?:\+?7|8)[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

const firstMatch = (text, regex, group = 1) => {
  const match = String(text ?? '').match(regex)
  return match?.[group] ?? ''
}

export const normalizeAiPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `7${digits}`
  if (digits.length !== 11) return ''
  if (digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits.startsWith('7') ? digits : ''
}

const normalizeHandle = (value, domains = []) => {
  let normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return ''
  normalized = normalized
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^m\./, '')
    .replace(/^@+/, '')
  for (const domain of domains) {
    if (normalized.startsWith(`${domain}/`)) {
      normalized = normalized.slice(domain.length + 1)
      break
    }
  }
  return normalized.split(/[/?#\s]/)[0].replace(/^@+/, '').trim()
}

const normalizeEmail = (value) => {
  const email = String(value ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export const normalizeAiClientContacts = (raw = {}) => ({
  phone: normalizeAiPhone(raw.phone ?? raw.clientPhone),
  whatsapp: normalizeAiPhone(raw.whatsapp ?? raw.clientWhatsapp),
  viber: normalizeAiPhone(raw.viber ?? raw.clientViber),
  email: normalizeEmail(raw.email ?? raw.clientEmail),
  telegram: normalizeHandle(raw.telegram ?? raw.clientTelegram, [
    't.me',
    'telegram.me',
  ]),
  instagram: normalizeHandle(raw.instagram ?? raw.clientInstagram, [
    'instagram.com',
  ]),
  vk: normalizeHandle(raw.vk ?? raw.clientVk, [
    'vk.com',
    'vk.ru',
    'vkontakte.ru',
  ]),
})

export const extractAiClientContacts = (text) => {
  const source = String(text ?? '')
  const genericPhone = source.match(PHONE_REGEX)?.[0] ?? ''
  const whatsapp =
    firstMatch(
      source,
      /(?:whats?app|ватсап|вотсап|wa)\s*[:\-]?\s*((?:\+?7|8)[\d\s().-]{10,})/i
    ) || firstMatch(source, /(?:https?:\/\/)?wa\.me\/(\d{10,15})/i)
  const viber = firstMatch(
    source,
    /(?:viber|вайбер)\s*[:\-]?\s*((?:\+?7|8)[\d\s().-]{10,})/i
  )
  const telegram =
    firstMatch(source, /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([\w.]+)/i) ||
    firstMatch(source, /(?:telegram|телеграм|tg)\s*[:\-]?\s*@?([\w.]+)/i)
  const instagram =
    firstMatch(source, /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([\w.]+)/i) ||
    firstMatch(source, /(?:instagram|инстаграм)\s*[:\-]?\s*@?([\w.]+)/i)
  const vk =
    firstMatch(source, /(?:https?:\/\/)?(?:www\.|m\.)?vk\.(?:com|ru)\/([\w.]+)/i) ||
    firstMatch(source, /(?:вконтакте|vk)\s*[:\-]?\s*@?([\w.]+)/i)

  return normalizeAiClientContacts({
    phone: genericPhone,
    whatsapp,
    viber,
    email: source.match(EMAIL_REGEX)?.[0] ?? '',
    telegram,
    instagram,
    vk,
  })
}

export const mergeAiClientContacts = (...sources) => {
  const merged = {}
  for (const source of sources) {
    const normalized = normalizeAiClientContacts(source)
    for (const [key, value] of Object.entries(normalized)) {
      if (value) merged[key] = value
    }
  }
  return normalizeAiClientContacts(merged)
}

export const keepAiContactsPresentInText = (rawContacts, text) => {
  const contacts = normalizeAiClientContacts(rawContacts)
  const source = String(text ?? '').toLocaleLowerCase('ru-RU')
  const sourceDigits = source.replace(/\D/g, '')
  const containsPhone = (value) =>
    value && sourceDigits.includes(String(value).slice(-10))
  const containsText = (value) => value && source.includes(String(value))

  return normalizeAiClientContacts({
    phone: containsPhone(contacts.phone) ? contacts.phone : '',
    whatsapp: containsPhone(contacts.whatsapp) ? contacts.whatsapp : '',
    viber: containsPhone(contacts.viber) ? contacts.viber : '',
    email: containsText(contacts.email) ? contacts.email : '',
    telegram: containsText(contacts.telegram) ? contacts.telegram : '',
    instagram: containsText(contacts.instagram) ? contacts.instagram : '',
    vk: containsText(contacts.vk) ? contacts.vk : '',
  })
}

const normalizeStoredClientContacts = (client = {}) =>
  normalizeAiClientContacts({
    phone: client.phone,
    whatsapp: client.whatsapp,
    viber: client.viber,
    email: client.email,
    telegram: client.telegram,
    instagram: client.instagram,
    vk: client.vk,
  })

export const findClientByAiContacts = (clients = [], contacts = {}) => {
  const target = normalizeAiClientContacts(contacts)
  const phoneValues = new Set(
    [target.phone, target.whatsapp, target.viber].filter(Boolean)
  )

  for (const client of clients) {
    const current = normalizeStoredClientContacts(client)
    if (
      phoneValues.size > 0 &&
      [current.phone, current.whatsapp, current.viber].some((value) =>
        phoneValues.has(value)
      )
    ) {
      return client
    }
    if (target.email && current.email === target.email) return client
    if (target.telegram && current.telegram === target.telegram) return client
    if (target.instagram && current.instagram === target.instagram) return client
    if (target.vk && current.vk === target.vk) return client
  }

  return null
}

const normalizeNameToken = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')

const tokenizeWords = (value) =>
  Array.from(
    normalizeNameToken(value).matchAll(/[а-яa-z][а-яa-z-]{1,}/gi),
    (match) => match[0]
  )

const NAME_STOP_WORDS = new Set([
  'без',
  'для',
  'за',
  'из',
  'или',
  'как',
  'на',
  'над',
  'от',
  'по',
  'под',
  'при',
  'про',
  'своего',
  'свой',
  'со',
  'это',
])

const tokenizeNameText = (value) =>
  tokenizeWords(value).filter(
    (token) => token.length >= 3 && !NAME_STOP_WORDS.has(token)
  )

const CLIENT_CUE_WORDS = new Set([
  'от',
  'для',
  'клиент',
  'клиента',
  'клиенту',
  'клиентом',
  'заказчик',
  'заказчика',
  'заказчику',
  'заказчиком',
])

const CLIENT_CUE_BREAK_WORDS = new Set([
  'без',
  'в',
  'во',
  'за',
  'из',
  'к',
  'на',
  'о',
  'об',
  'по',
  'с',
  'со',
  'у',
])

const getClientCueTokens = (value) => {
  const words = tokenizeWords(value)
  const result = []

  words.forEach((word, index) => {
    if (!CLIENT_CUE_WORDS.has(word)) return
    for (let offset = 1; offset <= 3; offset += 1) {
      const candidate = words[index + offset]
      if (!candidate || CLIENT_CUE_BREAK_WORDS.has(candidate)) break
      if (candidate.length >= 3 && !NAME_STOP_WORDS.has(candidate)) {
        result.push(candidate)
      }
    }
  })

  return Array.from(new Set(result))
}

const getRussianNameForms = (value) => {
  const token = normalizeNameToken(value)
  const forms = new Set([token])
  if (token.length < 3) return forms

  if (/(?:ий|ый|ой)$/.test(token)) {
    const stem = token.slice(0, -2)
    ;['ого', 'ому', 'ым', 'им', 'ом', 'ем'].forEach((ending) =>
      forms.add(`${stem}${ending}`)
    )
  } else if (token.endsWith('й')) {
    const stem = token.slice(0, -1)
    ;['я', 'ю', 'ем', 'е'].forEach((ending) => forms.add(`${stem}${ending}`))
  } else if (token.endsWith('ь')) {
    const stem = token.slice(0, -1)
    ;['я', 'ю', 'ем', 'е', 'и'].forEach((ending) =>
      forms.add(`${stem}${ending}`)
    )
  } else if (token.endsWith('а')) {
    const stem = token.slice(0, -1)
    const genitiveEnding = /[гкхжчшщ]$/.test(stem) ? 'и' : 'ы'
    ;[genitiveEnding, 'е', 'у', 'ой'].forEach((ending) =>
      forms.add(`${stem}${ending}`)
    )
  } else if (token.endsWith('я')) {
    const stem = token.slice(0, -1)
    ;['и', 'е', 'ю', 'ей'].forEach((ending) => forms.add(`${stem}${ending}`))
  } else if (/[бвгджзклмнпрстфхцчшщ]$/.test(token)) {
    ;['а', 'у', 'ом', 'ем', 'е', 'ым'].forEach((ending) =>
      forms.add(`${token}${ending}`)
    )
  }

  return forms
}

const getClientDisplayName = (client) =>
  [client?.firstName, client?.secondName, client?.thirdName]
    .filter(Boolean)
    .join(' ')
    .trim()

const getClientNameMatchScore = (client, sourceTokens) => {
  const clientTokens = Array.from(
    new Set(tokenizeNameText(getClientDisplayName(client)))
  )
  return clientTokens.reduce((score, token) => {
    const forms = getRussianNameForms(token)
    const exactMatch = sourceTokens.includes(token)
    const inflectedMatch = sourceTokens.some((sourceToken) =>
      forms.has(sourceToken)
    )
    return score + (exactMatch ? 3 : inflectedMatch ? 2 : 0)
  }, 0)
}

export const resolveAiClientByName = (
  clients = [],
  sourceText = ''
) => {
  const cueTokens = getClientCueTokens(sourceText)
  const sourceTokens =
    cueTokens.length > 0
      ? cueTokens
      : Array.from(new Set(tokenizeNameText(sourceText)))
  if (sourceTokens.length === 0) {
    return { client: null, candidates: [], ambiguous: false }
  }

  const scored = clients
    .map((client) => ({
      client,
      score: getClientNameMatchScore(client, sourceTokens),
    }))
    .filter((item) => item.score > 0)
  const bestScore = scored.reduce(
    (current, item) => Math.max(current, item.score),
    0
  )
  const candidates = scored
    .filter((item) => item.score === bestScore)
    .map((item) => item.client)

  return {
    client: candidates.length === 1 ? candidates[0] : null,
    candidates,
    ambiguous: candidates.length > 1,
  }
}

export const formatAiClientName = getClientDisplayName

export const hasAiClientContacts = (contacts = {}) =>
  Object.values(normalizeAiClientContacts(contacts)).some(Boolean)

const getPrimaryContact = (contacts) => {
  if (contacts.phone) return { channel: 'phone', label: `+${contacts.phone}` }
  if (contacts.whatsapp)
    return { channel: 'whatsapp', label: `+${contacts.whatsapp}` }
  if (contacts.telegram)
    return { channel: 'telegram', label: `@${contacts.telegram}` }
  if (contacts.email) return { channel: 'other', label: contacts.email }
  if (contacts.vk) return { channel: 'vk', label: `vk.com/${contacts.vk}` }
  if (contacts.instagram)
    return { channel: 'other', label: `instagram.com/${contacts.instagram}` }
  if (contacts.viber) return { channel: 'other', label: `+${contacts.viber}` }
  return { channel: '', label: 'Клиент из AI-черновика' }
}

export const buildAiClientPayload = ({ clientName, contacts: rawContacts }) => {
  const contacts = normalizeAiClientContacts(rawContacts)
  const primary = getPrimaryContact(contacts)
  const normalizedName = String(clientName ?? '').trim().slice(0, 100)

  return {
    firstName: normalizedName || primary.label.slice(0, 100),
    phone: contacts.phone ? Number(contacts.phone) : null,
    whatsapp: contacts.whatsapp ? Number(contacts.whatsapp) : null,
    viber: contacts.viber ? Number(contacts.viber) : null,
    email: contacts.email,
    telegram: contacts.telegram,
    instagram: contacts.instagram,
    vk: contacts.vk,
    preferredContactChannel: primary.channel,
  }
}

const normalizeSearchText = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()

export const matchAiServiceIds = (text, services = []) => {
  const normalizedText = ` ${normalizeSearchText(text)} `
  if (!normalizedText.trim()) return []

  return services
    .filter((service) => {
      const title = normalizeSearchText(service?.title)
      return title.length >= 3 && normalizedText.includes(` ${title} `)
    })
    .map((service) => String(service._id))
}
