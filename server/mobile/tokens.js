import crypto from 'crypto'
import getAuthSecret from '../getAuthSecret.js'

const ACCESS_TOKEN_TTL_SEC = Math.max(
  300,
  Number(process.env.MOBILE_ACCESS_TOKEN_TTL_SEC || 15 * 60)
)
const TOKEN_ISSUER = 'artistcrm'
const TOKEN_AUDIENCE = 'artistcrm-mobile'

const encode = (value) => Buffer.from(value).toString('base64url')
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const sign = (value) =>
  crypto
    .createHmac('sha256', String(getAuthSecret()))
    .update(value)
    .digest('base64url')

const signaturesEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export const createMobileAccessToken = ({ user, tenantId, sessionId }) => {
  const now = Math.floor(Date.now() / 1000)
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = encode(
    JSON.stringify({
      iss: TOKEN_ISSUER,
      aud: TOKEN_AUDIENCE,
      type: 'access',
      sub: String(user._id),
      sid: String(sessionId),
      tenantId: String(tenantId),
      role: user.role || 'user',
      iat: now,
      exp: now + ACCESS_TOKEN_TTL_SEC,
    })
  )
  const unsigned = `${header}.${payload}`
  return {
    token: `${unsigned}.${sign(unsigned)}`,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  }
}

export const verifyMobileAccessToken = (token) => {
  try {
    const [header, payload, signature] = String(token || '').split('.')
    if (!header || !payload || !signature) return null
    const unsigned = `${header}.${payload}`
    if (!signaturesEqual(signature, sign(unsigned))) return null

    const headerData = JSON.parse(decode(header))
    const data = JSON.parse(decode(payload))
    const now = Math.floor(Date.now() / 1000)
    if (headerData?.alg !== 'HS256' || headerData?.typ !== 'JWT') return null
    if (data?.iss !== TOKEN_ISSUER || data?.aud !== TOKEN_AUDIENCE) return null
    if (data?.type !== 'access' || !data?.sub || !data?.sid) return null
    if (!Number(data?.exp) || Number(data.exp) <= now) return null
    return data
  } catch (error) {
    return null
  }
}

export const createRefreshToken = () => crypto.randomBytes(48).toString('base64url')

export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex')

export { ACCESS_TOKEN_TTL_SEC }
