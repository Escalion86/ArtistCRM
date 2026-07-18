import dbConnect from '@server/dbConnect'
import MobileSessions from '@models/MobileSessions'
import Users from '@models/Users'
import {
  createMobileAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from './tokens'
import {
  findActiveMobileSessionByRefreshHash,
  findMobileSessionByRefreshHash,
  listActiveMobileSessionRecords,
  normalizeMobileDevice,
  revokeAllMobileSessionRecords,
  revokeMobileSessionRecord,
  rotateMobileSessionToken,
} from './sessionStore.js'
import { serializeMobileProfile } from './profile.js'
import { serializeMobileUserWithTariff } from './tariff.js'

const REFRESH_TOKEN_TTL_MS = Math.max(
  24 * 60 * 60 * 1000,
  Number(process.env.MOBILE_REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000)
)

export const sanitizeMobileUser = serializeMobileProfile

const buildSessionResponse = async (user, session, refreshToken) => {
  const safeUser = await serializeMobileUserWithTariff(user)
  const access = createMobileAccessToken({
    user,
    tenantId: safeUser.tenantId,
    sessionId: session._id,
  })
  return {
    accessToken: access.token,
    refreshToken,
    expiresIn: access.expiresIn,
    tokenType: 'Bearer',
    user: safeUser,
  }
}

export const createMobileSession = async ({ user, device }) => {
  await dbConnect()
  const tenantId = user?.tenantId || user?._id
  if (!user?._id || !tenantId) throw new Error('MOBILE_USER_INVALID')

  const refreshToken = createRefreshToken()
  const session = await MobileSessions.create({
    userId: user._id,
    tenantId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    ...normalizeMobileDevice(device),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })

  return buildSessionResponse(user, session, refreshToken)
}

export const rotateMobileSession = async ({ refreshToken, device }) => {
  await dbConnect()
  const now = new Date()
  const refreshTokenHash = hashRefreshToken(refreshToken)
  const session = await findActiveMobileSessionByRefreshHash({
    model: MobileSessions,
    refreshTokenHash,
    now,
  })
  if (!session) return null

  const user = await Users.findById(session.userId)
  if (!user || user.archive) {
    await revokeMobileSessionRecord({
      model: MobileSessions,
      sessionId: session._id,
      now,
    })
    return null
  }

  const nextRefreshToken = createRefreshToken()
  const rotated = await rotateMobileSessionToken({
    model: MobileSessions,
    sessionId: session._id,
    expectedRefreshTokenHash: refreshTokenHash,
    nextRefreshTokenHash: hashRefreshToken(nextRefreshToken),
    device: { ...session, ...device },
    now,
  })
  if (!rotated) return null

  return buildSessionResponse(user, rotated, nextRefreshToken)
}

export const revokeMobileSession = async ({ refreshToken, sessionId, userId }) => {
  await dbConnect()
  return revokeMobileSessionRecord({
    model: MobileSessions,
    refreshTokenHash: refreshToken ? hashRefreshToken(refreshToken) : '',
    sessionId,
    userId,
  })
}

export const findMobileSessionForLogout = async (refreshToken) => {
  if (!refreshToken) return null
  await dbConnect()
  return findMobileSessionByRefreshHash({
    model: MobileSessions,
    refreshTokenHash: hashRefreshToken(refreshToken),
  })
}

export const revokeAllMobileSessions = async (userId) => {
  await dbConnect()
  return revokeAllMobileSessionRecords({ model: MobileSessions, userId })
}

export const listMobileSessions = async (userId) => {
  await dbConnect()
  return listActiveMobileSessionRecords({
    model: MobileSessions,
    userId,
  })
}
