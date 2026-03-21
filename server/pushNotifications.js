import webpush from 'web-push'
import PushSubscriptions from '@models/PushSubscriptions'

let isConfigured = false

const getVapidConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@artistcrm.ru'
  return {
    publicKey: String(publicKey).trim(),
    privateKey: String(privateKey).trim(),
    subject: String(subject).trim(),
  }
}

const ensureWebPushConfigured = () => {
  if (isConfigured) return true
  const { publicKey, privateKey, subject } = getVapidConfig()
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  isConfigured = true
  return true
}

const parseSubscription = (value) => {
  if (!value || typeof value !== 'object') return null
  const endpoint = String(value.endpoint || '').trim()
  const keys = value.keys && typeof value.keys === 'object' ? value.keys : {}
  const p256dh = String(keys.p256dh || '').trim()
  const auth = String(keys.auth || '').trim()
  if (!endpoint || !p256dh || !auth) return null
  return {
    endpoint,
    keys: { p256dh, auth },
  }
}

const savePushSubscription = async ({
  tenantId,
  subscription,
  userAgent = '',
  isActive = true,
}) => {
  const normalized = parseSubscription(subscription)
  if (!tenantId || !normalized) return null

  return PushSubscriptions.findOneAndUpdate(
    {
      tenantId,
      endpoint: normalized.endpoint,
    },
    {
      $set: {
        tenantId,
        endpoint: normalized.endpoint,
        keys: normalized.keys,
        userAgent: String(userAgent || '').slice(0, 500),
        isActive: Boolean(isActive),
      },
    },
    { upsert: true, new: true }
  )
}

const deactivatePushSubscription = async ({ tenantId, endpoint }) => {
  if (!tenantId || !endpoint) return 0
  const result = await PushSubscriptions.updateOne(
    { tenantId, endpoint },
    { $set: { isActive: false } }
  )
  return Number(result?.modifiedCount || 0)
}

const sendPushToTenant = async ({ tenantId, payload }) => {
  if (!tenantId || !payload || typeof payload !== 'object') {
    return { ok: false, sent: 0, failed: 0, deactivated: 0 }
  }
  if (!ensureWebPushConfigured()) {
    return { ok: false, sent: 0, failed: 0, deactivated: 0, reason: 'no_vapid' }
  }

  const docs = await PushSubscriptions.find({
    tenantId,
    isActive: true,
  })
    .select('endpoint keys')
    .lean()

  if (!Array.isArray(docs) || docs.length === 0) {
    return { ok: true, sent: 0, failed: 0, deactivated: 0 }
  }

  let sent = 0
  let failed = 0
  let deactivated = 0
  const body = JSON.stringify(payload)

  for (const doc of docs) {
    const subscription = parseSubscription(doc)
    if (!subscription) continue
    try {
      await webpush.sendNotification(subscription, body)
      sent += 1
      await PushSubscriptions.updateOne(
        { tenantId, endpoint: subscription.endpoint },
        { $set: { lastSentAt: new Date(), isActive: true } }
      )
    } catch (error) {
      failed += 1
      const statusCode = Number(error?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await PushSubscriptions.updateOne(
          { tenantId, endpoint: subscription.endpoint },
          { $set: { isActive: false } }
        )
        deactivated += 1
      }
    }
  }

  return {
    ok: true,
    sent,
    failed,
    deactivated,
  }
}

const getPushPublicKey = () => {
  const { publicKey } = getVapidConfig()
  return publicKey
}

export {
  parseSubscription,
  savePushSubscription,
  deactivatePushSubscription,
  sendPushToTenant,
  getPushPublicKey,
}
