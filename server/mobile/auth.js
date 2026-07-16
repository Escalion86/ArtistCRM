import crypto from 'crypto'
import dbConnect from '@server/dbConnect'
import MobileSessions from '@models/MobileSessions'
import Users from '@models/Users'
import getAuthSecret from '@server/getAuthSecret'
import { verifyMobileAccessToken } from './tokens'
import { findAuthorizedMobileSession } from './sessionStore.js'

const decodeBase64Url = (value) => {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

const getBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return ''
  return authHeader.slice(7).trim()
}

const toMobileUser = (user) => {
  if (!user?._id) return null
  const tenantId = user.tenantId || user._id
  return {
    _id: String(user._id),
    phone: user.phone ?? '',
    firstName: user.firstName ?? '',
    secondName: user.secondName ?? '',
    thirdName: user.thirdName ?? '',
    email: user.email ?? '',
    role: user.role ?? 'user',
    tenantId: String(tenantId),
    tariffId: user.tariffId ? String(user.tariffId) : null,
    registrationType: user.registrationType || 'phone',
  }
}

const verifyV1Token = async (token) => {
  const payload = verifyMobileAccessToken(token)
  if (!payload) return null

  await dbConnect()
  const now = new Date()
  const [user, session] = await Promise.all([
    Users.findById(payload.sub).lean(),
    findAuthorizedMobileSession({
      model: MobileSessions,
      sessionId: payload.sid,
      userId: payload.sub,
      now,
    }),
  ])
  if (!user || user.archive || !session) return null

  const mobileUser = toMobileUser(user)
  if (!mobileUser || mobileUser.tenantId !== String(payload.tenantId)) return null
  return { user: mobileUser, sessionId: String(session._id), tokenVersion: 'v1' }
}

const verifyLegacyToken = async (token) => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    const expectedSignature = crypto
      .createHmac('sha256', String(getAuthSecret()))
      .update(`${header}.${body}`)
      .digest('hex')
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null
    }

    const payload = JSON.parse(decodeBase64Url(body))
    if (!payload.uid || !payload.exp || Number(payload.exp) < Date.now()) return null

    await dbConnect()
    const user = await Users.findById(payload.uid).lean()
    if (!user || user.archive) return null
    return { user: toMobileUser(user), sessionId: null, tokenVersion: 'legacy' }
  } catch (error) {
    return null
  }
}

export const verifyMobileToken = async (authHeader) => {
  const token = getBearerToken(authHeader)
  if (!token) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }

  const result = (await verifyV1Token(token)) || (await verifyLegacyToken(token))
  if (!result?.user) return { error: 'Invalid or expired token', status: 401 }
  return result
}

export const getMobileUser = async (req) => {
  const authHeader = req.headers.get('authorization') || ''
  return verifyMobileToken(authHeader)
}
