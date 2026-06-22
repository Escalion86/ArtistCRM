const readAllowedSecrets = (env = process.env) =>
  [
    env.PUSH_REMINDERS_CRON_SECRET,
    env.CRON_SECRET,
    env.BILLING_CRON_SECRET,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

export const canRunPushReminderCron = (req, env = process.env) => {
  const allowedSecrets = new Set(readAllowedSecrets(env))
  if (allowedSecrets.size === 0) return { ok: false }

  const headerToken = req.headers.get('x-cron-secret') || ''
  const authorization = req.headers.get('authorization') || ''
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
  const url = new URL(req.url)
  const queryToken = url.searchParams.get('token') || ''

  const suppliedTokens = [headerToken, bearerToken, queryToken]
    .map((value) => String(value || '').trim())
    .filter(Boolean)

  return {
    ok: suppliedTokens.some((token) => allowedSecrets.has(token)),
  }
}
