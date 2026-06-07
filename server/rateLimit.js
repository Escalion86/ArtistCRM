import crypto from 'crypto'
import RateLimitCounters from '@models/RateLimitCounters'
import dbConnect from '@server/dbConnect'

const getFirstHeaderValue = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0] || ''

export const getRequestIp = (req) =>
  getFirstHeaderValue(req.headers.get('x-forwarded-for')) ||
  getFirstHeaderValue(req.headers.get('x-real-ip')) ||
  getFirstHeaderValue(req.headers.get('cf-connecting-ip')) ||
  'unknown'

const hashKey = (parts) =>
  crypto
    .createHash('sha256')
    .update(parts.map((part) => String(part || '')).join('|'))
    .digest('hex')

export const checkRateLimit = async ({
  req,
  scope,
  limit,
  windowMs,
  keyParts = [],
}) => {
  const normalizedLimit = Number(limit)
  const normalizedWindowMs = Number(windowMs)
  if (!scope || normalizedLimit <= 0 || normalizedWindowMs <= 0) {
    return { ok: true, count: 0, remaining: Number.MAX_SAFE_INTEGER }
  }

  await dbConnect()

  const now = Date.now()
  const windowStartMs = Math.floor(now / normalizedWindowMs) * normalizedWindowMs
  const windowStart = new Date(windowStartMs)
  const expiresAt = new Date(windowStartMs + normalizedWindowMs * 2)
  const keyHash = hashKey([getRequestIp(req), ...keyParts])

  const counter = await RateLimitCounters.findOneAndUpdate(
    { scope, keyHash, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { scope, keyHash, windowStart, expiresAt },
    },
    { upsert: true, returnDocument: 'after' }
  ).lean()

  const count = Number(counter?.count || 0)
  const retryAfter = Math.max(
    1,
    Math.ceil((windowStartMs + normalizedWindowMs - now) / 1000)
  )

  return {
    ok: count <= normalizedLimit,
    count,
    remaining: Math.max(normalizedLimit - count, 0),
    retryAfter,
  }
}

export const rateLimitResponse = (NextResponse, result) =>
  NextResponse.json(
    {
      success: false,
      error: 'Слишком много запросов, попробуйте позже',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result?.retryAfter || 60),
      },
    }
  )
