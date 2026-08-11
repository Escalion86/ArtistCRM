import crypto from 'crypto'

const TICKET_TYPE = 'developer_impersonation'
const DEFAULT_LIFETIME_MS = 30 * 1000

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url')

const decodeBase64Url = (value) =>
  Buffer.from(String(value), 'base64url').toString('utf8')

const signPayload = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest()

export const createImpersonationTicket = (
  { action, originalUserId, targetUserId },
  secret,
  lifetimeMs = DEFAULT_LIFETIME_MS
) => {
  if (!secret || !originalUserId || !targetUserId) return ''
  if (!['start', 'restore'].includes(action)) return ''

  const payload = {
    type: TICKET_TYPE,
    action,
    originalUserId: String(originalUserId),
    targetUserId: String(targetUserId),
    exp: Date.now() + lifetimeMs,
    nonce: crypto.randomBytes(16).toString('hex'),
  }
  const encoded = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encoded, secret).toString('base64url')
  return `${encoded}.${signature}`
}

export const verifyImpersonationTicket = (ticket, secret) => {
  if (!ticket || !secret) return null
  const [encoded, signature] = String(ticket).split('.')
  if (!encoded || !signature) return null

  const expected = signPayload(encoded, secret)
  let received = null
  try {
    received = Buffer.from(signature, 'base64url')
  } catch (error) {
    return null
  }
  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded))
    if (payload?.type !== TICKET_TYPE) return null
    if (!['start', 'restore'].includes(payload?.action)) return null
    if (!payload?.originalUserId || !payload?.targetUserId || !payload?.exp) {
      return null
    }
    if (Date.now() >= Number(payload.exp)) return null
    return payload
  } catch (error) {
    return null
  }
}
