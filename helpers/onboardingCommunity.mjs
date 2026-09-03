const TELEGRAM_COMMUNITY_HOSTS = new Set([
  't.me',
  'www.t.me',
  'telegram.me',
  'www.telegram.me',
])

export const normalizeTelegramCommunityUrl = (value) => {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return ''

  if (/^tg:/i.test(rawValue)) {
    // Accept the shorthand invite, but save Telegram's supported deep link.
    const invite = rawValue.match(
      /^tg:\/\/(?:\+([A-Za-z0-9_-]+)\/?|join\/?\?invite=([A-Za-z0-9_-]+))(?:#.*)?$/i
    )
    return invite ? `tg://join?invite=${invite[1] || invite[2]}` : ''
  }

  const valueWithProtocol = /^(?:https?):\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`

  try {
    const url = new URL(valueWithProtocol)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || !TELEGRAM_COMMUNITY_HOSTS.has(host)) {
      return ''
    }
    if (!url.pathname || url.pathname === '/' || /\s/.test(url.pathname)) {
      return ''
    }

    url.hostname =
      host === 'telegram.me' || host === 'www.telegram.me' ? 't.me' : host
    url.hash = ''
    return url.toString()
  } catch (error) {
    return ''
  }
}

export const getTelegramCommunityUrlError = (value) => {
  if (!String(value ?? '').trim()) return ''
  return normalizeTelegramCommunityUrl(value)
    ? ''
    : 'Укажите ссылку вида https://t.me/название_группы, tg://+код или tg://join?invite=код'
}
