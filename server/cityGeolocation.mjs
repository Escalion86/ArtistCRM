import { isIP } from 'node:net'
import { isAbsolute } from 'node:path'
import maxmind from 'maxmind'

const READER_TTL_MS = 60 * 60 * 1000
const RETRY_DELAY_MS = 60 * 1000

// Only trust the header overwritten by our reverse proxy, never a client IP
// supplied in query params or the first entry of X-Forwarded-For.
export const getGeoIpAddress = (headers, trustProxy) => {
  if (trustProxy !== 'true') return ''
  const value = headers.get('x-real-ip')?.trim() || ''
  if (value.length > 45 || value.includes('%') || !isIP(value)) return ''
  return value.replace(/^::ffff:(?=\d+\.)/i, '')
}

const getCityName = (record) => {
  for (const name of [record?.city?.names?.ru, record?.city?.names?.en]) {
    if (typeof name !== 'string') continue
    const town = name.trim()
    if (town && town.length <= 120 && !/[\u0000-\u001f\u007f]/.test(town)) {
      return town
    }
  }
  return null
}

export const createCityLookup = ({
  openDatabase = maxmind.open,
  now = Date.now,
} = {}) => {
  let cached = null

  return async (headers, env = process.env) => {
    const ip = getGeoIpAddress(headers, env.GEOIP_TRUST_PROXY)
    const databasePath = env.GEOIP_CITY_DB_PATH?.trim()
    if (!ip || !databasePath || !isAbsolute(databasePath)) return null

    if (!cached || cached.path !== databasePath || cached.expiresAt <= now()) {
      const entry = {
        path: databasePath,
        expiresAt: now() + READER_TTL_MS,
        promise: null,
      }
      entry.promise = Promise.resolve()
        .then(() => openDatabase(databasePath))
        .catch(() => {
          // A missing/unreadable database must not break the first-run wizard.
          // Back off without logging the IP, file path or raw exception.
          entry.expiresAt = now() + RETRY_DELAY_MS
          return null
        })
      cached = entry
    }

    try {
      const reader = await cached.promise
      return getCityName(reader?.get(ip))
    } catch {
      return null
    }
  }
}

export const detectCity = createCityLookup()
