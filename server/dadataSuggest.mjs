const DADATA_SUGGEST_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'
const CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX_ENTRIES = 500
const REQUEST_TIMEOUT_MS = 4000
const MIN_QUERY_LENGTH = 4
const SUGGEST_COUNT = 7

// In-memory кэш: key -> { expiresAt, payload }
const cache = new Map()

const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.payload
}

const setCached = (key, payload) => {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload })
}

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '')

const formatHouse = (data) => {
  const house = trimValue(data?.house)
  const block = trimValue(data?.block)
  if (!house) return ''
  if (!block) return house
  const blockType = trimValue(data?.block_type)
  return blockType ? `${house} ${blockType} ${block}` : `${house} ${block}`
}

const mapDadataSuggestion = (suggestion) => {
  const data = suggestion?.data ?? {}
  return {
    label:
      trimValue(suggestion?.unrestricted_value) ||
      trimValue(suggestion?.value),
    address: {
      town: trimValue(data.city) || trimValue(data.settlement),
      street: trimValue(data.street_with_type) || trimValue(data.street),
      house: formatHouse(data),
      latitude: trimValue(data.geo_lat),
      longitude: trimValue(data.geo_lon),
    },
  }
}

const isDadataConfigured = () => Boolean(process.env.DADATA_API_KEY)

const requestDaData = async (body) => {
  const res = await fetch(DADATA_SUGGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${process.env.DADATA_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    // query не логируем — адреса относятся к чувствительным данным
    const error = new Error(`DaData HTTP ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

const suggestAddresses = async ({ query, town }) => {
  if (!isDadataConfigured()) return { unavailable: true, suggestions: [] }
  const normalizedQuery = trimValue(query)
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return { unavailable: false, suggestions: [] }
  }
  const normalizedTown = trimValue(town)
  const cacheKey = `suggest|${normalizedQuery.toLowerCase()}|${normalizedTown.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const body = {
    query: normalizedQuery,
    count: SUGGEST_COUNT,
    language: 'ru',
    to_bound: { value: 'house' },
  }
  if (normalizedTown) body.locations_boost = [{ city: normalizedTown }]

  const json = await requestDaData(body)
  const payload = {
    unavailable: false,
    suggestions: (json?.suggestions ?? []).map(mapDadataSuggestion),
  }
  setCached(cacheKey, payload)
  return payload
}

// «Выбор подсказки» по контракту DaData: count=1, query = unrestricted_value
// предыдущего ответа — только так гарантированно заполняются geo_lat/geo_lon.
const selectAddress = async ({ query }) => {
  if (!isDadataConfigured()) return null
  const normalizedQuery = trimValue(query)
  if (!normalizedQuery) return null
  const cacheKey = `select|${normalizedQuery.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const json = await requestDaData({
    query: normalizedQuery,
    count: 1,
    language: 'ru',
  })
  const suggestion = json?.suggestions?.[0]
  const selected = suggestion ? mapDadataSuggestion(suggestion) : null
  if (selected) setCached(cacheKey, selected)
  return selected
}

export { isDadataConfigured, mapDadataSuggestion, selectAddress, suggestAddresses }
