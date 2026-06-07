import getTenantContext from '@server/getTenantContext'

const MAX_LOG_BODY_LENGTH = 16 * 1024
const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[_-]?key/i

const sanitize = (value, depth = 0) => {
  if (depth > 4) return '[truncated]'
  if (typeof value === 'string') return value.slice(0, 2000)
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(String(key)))
      .map(([key, item]) => [key, sanitize(item, depth + 1)])
  )
}

export async function POST(request) {
  try {
    const { user, tenantId } = await getTenantContext()
    if (!user?._id) return new Response(null, { status: 204 })

    const text = await request.text()
    if (!text || text.length > MAX_LOG_BODY_LENGTH) {
      return new Response(null, { status: 204 })
    }
    const payload = JSON.parse(text)
    console.error('client-log', {
      tenantId: tenantId ? String(tenantId) : '',
      userId: String(user._id),
      payload: sanitize(payload),
    })
  } catch (error) {
    console.error('client-log-parse-error', error?.message || error)
  }

  return new Response(null, { status: 204 })
}
