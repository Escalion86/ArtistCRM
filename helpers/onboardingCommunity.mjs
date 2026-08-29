const TELEGRAM_COMMUNITY_HOSTS = new Set([
  't.me',
  'www.t.me',
  'telegram.me',
  'www.telegram.me',
])

export const normalizeTelegramCommunityUrl = (value) => {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return ''

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
    : 'Укажите ссылку вида https://t.me/название_группы'
}
