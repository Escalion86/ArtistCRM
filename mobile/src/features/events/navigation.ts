import type { Event } from '../../shared/domain/types'

type Address = NonNullable<Event['address']>

const safeNavigationUrl = (value?: string) => {
  const url = String(value || '').trim()
  return /^(https?:\/\/|yandexnavi:\/\/|dgis:\/\/)/i.test(url) ? url : ''
}

export const formatEventAddress = (address?: Address) => {
  if (!address) return ''
  const main = [address.town, address.street, address.house].filter(Boolean).join(', ')
  const details = [
    address.entrance ? `подъезд ${address.entrance}` : '',
    address.floor ? `этаж ${address.floor}` : '',
    address.flat ? `офис/кв. ${address.flat}` : '',
  ].filter(Boolean).join(', ')
  return [main, details, address.comment].filter(Boolean).join('\n')
}

export const buildEventNavigationLinks = (address?: Address) => {
  if (!address) return []
  const query = [address.town, address.street, address.house].filter(Boolean).join(', ').trim()
  const coordinates = address.latitude && address.longitude
    ? `${address.latitude},${address.longitude}`
    : ''
  if (!query && !coordinates) return []
  const search = coordinates || query
  const explicit2Gis = safeNavigationUrl(address.link2Gis)
  const explicitYandex = safeNavigationUrl(address.linkYandexNavigator)
  return [
    {
      provider: '2gis' as const,
      title: 'Открыть в 2ГИС',
      url: explicit2Gis || `https://2gis.ru/search/${encodeURIComponent(search)}`,
    },
    {
      provider: 'yandex' as const,
      title: 'Открыть в Яндекс Картах',
      url: explicitYandex || `https://yandex.ru/maps/?text=${encodeURIComponent(search)}`,
    },
  ]
}

