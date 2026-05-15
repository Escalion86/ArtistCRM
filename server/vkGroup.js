import crypto from 'crypto'
import SiteSettings from '@models/SiteSettings'
import Events from '@models/Events'
import VkConversations from '@models/VkConversations'
import VkMessages from '@models/VkMessages'
import {
  createPublicLeadDraftEvent,
  normalizeText,
  readCustomValue,
} from '@server/publicLeadService'
import {
  getPublicLeadPushState,
  logPublicLeadPushDiagnostic,
  logPublicLeadPushError,
  logPublicLeadPushSkipped,
  notifyApiLeadCreated,
} from '@server/publicLeadPush'

const VK_API_BASE_URL = 'https://api.vk.com/method'
const VK_API_VERSION = '5.199'

const toObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

const getFirstString = (...values) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim()
  )
  return value === undefined || value === null ? '' : String(value).trim()
}

const createVkWebhookToken = () =>
  `vk_${crypto.randomUUID().replace(/-/g, '')}`

const createVkWebhookSecret = () =>
  `vksec_${crypto.randomUUID().replace(/-/g, '')}`

const normalizeVkSettings = (custom) => ({
  enabled: readCustomValue(custom, 'vkGroupEnabled') === true,
  groupId: normalizeText(readCustomValue(custom, 'vkGroupId'), 120),
  accessToken: normalizeText(readCustomValue(custom, 'vkGroupAccessToken'), 512),
  confirmationCode: normalizeText(
    readCustomValue(custom, 'vkGroupConfirmationCode'),
    256
  ),
  webhookSecret: normalizeText(readCustomValue(custom, 'vkGroupWebhookSecret'), 160),
  webhookToken: normalizeText(readCustomValue(custom, 'vkGroupWebhookToken'), 160),
  webhookUrl: normalizeText(readCustomValue(custom, 'vkGroupWebhookUrl'), 1000),
  status: normalizeText(readCustomValue(custom, 'vkGroupStatus'), 80),
  lastError: normalizeText(readCustomValue(custom, 'vkGroupLastError'), 1000),
  connectedAt: normalizeText(readCustomValue(custom, 'vkGroupConnectedAt'), 80),
  lastCheckedAt: normalizeText(readCustomValue(custom, 'vkGroupLastCheckedAt'), 80),
  lastWebhookAt: normalizeText(readCustomValue(custom, 'vkGroupLastWebhookAt'), 80),
  lastPeerId: normalizeText(readCustomValue(custom, 'vkGroupLastPeerId'), 160),
})

const buildPublicBaseUrl = (req) => {
  const envDomain = normalizeText(process.env.DOMAIN, 300)
  if (envDomain) {
    return envDomain.startsWith('http') ? envDomain : `https://${envDomain}`
  }

  const origin = normalizeText(req?.headers?.get?.('origin'), 300)
  if (origin) return origin

  const host = normalizeText(req?.headers?.get?.('host'), 300)
  if (!host) return ''
  const proto = normalizeText(req?.headers?.get?.('x-forwarded-proto'), 20)
  return `${proto || 'https'}://${host}`
}

const buildVkWebhookUrl = ({ req, token }) => {
  const baseUrl = buildPublicBaseUrl(req).replace(/\/+$/, '')
  if (!baseUrl || !token) return ''
  return `${baseUrl}/api/integrations/vk/webhook/${token}`
}

const callVkApi = async (method, params = {}) => {
  const body = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.set(key, String(value))
    }
  })
  body.set('v', params.v || VK_API_VERSION)

  const response = await fetch(`${VK_API_BASE_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.error) {
    const error = payload?.error
    const message =
      error?.error_msg ||
      payload?.message ||
      `VK API ${method} failed: ${response.status}`
    throw new Error(message)
  }

  return payload.response
}

const checkVkGroupAccess = async ({ accessToken, groupId }) => {
  const params = { access_token: accessToken }
  if (groupId) {
    params.group_id = groupId
    params.group_ids = groupId
  }
  return callVkApi('groups.getById', params)
}

const sendVkMessage = async ({ accessToken, peerId, text }) => {
  if (!accessToken || !peerId || !text) {
    return { ok: false, error: 'missing_send_params' }
  }

  try {
    const response = await callVkApi('messages.send', {
      access_token: accessToken,
      peer_id: peerId,
      random_id: Date.now(),
      message: text,
    })
    return { ok: true, payload: response }
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      payload: null,
    }
  }
}

const normalizeVkWebhookPayload = (body = {}) => {
  const object = toObject(body?.object)
  const message = toObject(object?.message || body?.message)
  const text = normalizeText(getFirstString(message?.text, body?.text), 5000)
  const peerId = normalizeText(
    getFirstString(message?.peer_id, message?.from_id, body?.peer_id),
    160
  )
  const userId = normalizeText(getFirstString(message?.from_id, body?.from_id), 160)
  const messageId = normalizeText(
    getFirstString(
      message?.id,
      message?.conversation_message_id,
      body?.message_id
    ),
    160
  )
  const groupId = normalizeText(getFirstString(body?.group_id, object?.group_id), 160)
  const date = Number(message?.date) > 0 ? new Date(Number(message.date) * 1000) : null

  return {
    source: 'vk_group',
    sourceLabel: 'VK',
    name: userId ? `Клиент VK ${userId}` : 'Клиент VK',
    phone: '',
    comment: text || 'Новое сообщение из VK',
    vkPeerId: peerId,
    vkMessageId: messageId,
    vkUserId: userId,
    vkGroupId: groupId,
    sentAt: date,
  }
}

const findClientForVkConversation = async ({ tenantId, normalized }) => {
  if (!normalized.vkUserId) return null
  const conversation = await VkConversations.findOne({
    tenantId,
    vkUserId: normalized.vkUserId,
    clientId: { $ne: null },
  })
    .sort({ lastMessageAt: -1 })
    .lean()
  return conversation?.clientId ?? null
}

const upsertVkConversation = async ({
  tenantId,
  normalized,
  rawPayload,
  clientId,
  eventId,
}) => {
  if (!normalized.vkPeerId) return null

  const now = normalized.sentAt || new Date()
  const existing = await VkConversations.findOne({
    tenantId,
    vkPeerId: normalized.vkPeerId,
  })

  const update = {
    tenantId,
    clientId: clientId ?? existing?.clientId ?? null,
    eventId: eventId ?? existing?.eventId ?? null,
    vkPeerId: normalized.vkPeerId,
    vkUserId: normalized.vkUserId || existing?.vkUserId || '',
    vkGroupId: normalized.vkGroupId || existing?.vkGroupId || '',
    clientName: normalized.name || existing?.clientName || '',
    lastMessageText: normalized.comment || existing?.lastMessageText || '',
    lastMessageAt: now,
    raw: rawPayload,
  }

  return VkConversations.findOneAndUpdate(
    { tenantId, vkPeerId: normalized.vkPeerId },
    existing
      ? { $set: update, $inc: { unreadCount: 1 } }
      : { $set: update, $setOnInsert: { status: 'open', unreadCount: 1 } },
    { upsert: true, returnDocument: 'after' }
  )
}

const saveIncomingVkMessage = async ({
  tenantId,
  conversation,
  normalized,
  rawPayload,
}) => {
  if (!conversation?._id || !normalized.vkPeerId) return null

  if (normalized.vkMessageId) {
    const existing = await VkMessages.findOne({
      tenantId,
      vkPeerId: normalized.vkPeerId,
      vkMessageId: normalized.vkMessageId,
    }).lean()
    if (existing) return existing
  }

  return VkMessages.create({
    tenantId,
    conversationId: conversation._id,
    clientId: conversation.clientId ?? null,
    eventId: conversation.eventId ?? null,
    vkPeerId: normalized.vkPeerId,
    vkMessageId: normalized.vkMessageId,
    vkUserId: normalized.vkUserId,
    direction: 'incoming',
    text: normalized.comment,
    sentAt: normalized.sentAt || new Date(),
    status: 'received',
    raw: rawPayload,
  })
}

const appendMessageToExistingEvent = async ({ event, normalized, rawPayload }) => {
  const clientData = toObject(event.clientData)
  const lead = toObject(clientData.lead)
  const messages = Array.isArray(lead.messages) ? lead.messages.slice(-49) : []
  const nextMessage = {
    id: normalized.vkMessageId,
    text: normalized.comment,
    receivedAt: new Date().toISOString(),
    raw: rawPayload,
  }

  const duplicateMessage =
    nextMessage.id && messages.some((item) => item?.id === nextMessage.id)
  const nextLead = {
    ...lead,
    ...normalized,
    raw: rawPayload,
    lastMessageAt: new Date().toISOString(),
    messages: duplicateMessage ? messages : [...messages, nextMessage],
  }

  event.clientData = {
    ...clientData,
    source: 'VK',
    sourceLabel: 'VK',
    createdViaApi: true,
    lead: nextLead,
  }

  if (
    normalized.comment &&
    !String(event.description || '').includes(normalized.comment)
  ) {
    event.description = `${event.description || ''}\n\nVK: ${normalized.comment}`.trim()
  }

  await event.save()
  return event
}

const notifyVkLead = async ({ tenantId, event, normalized, siteSettings }) => {
  const configuredPushEnabled =
    readCustomValue(siteSettings?.custom, 'publicLeadPushEnabled') === true
  const pushState = await getPublicLeadPushState({
    tenantId,
    configured: configuredPushEnabled,
  })

  await logPublicLeadPushDiagnostic({
    tenantId,
    event,
    stage: 'resolved',
    message: 'Диагностика push по VK-заявке: состояние перед отправкой',
    meta: {
      configured: pushState.configured,
      activeSubscriptions: pushState.activeSubscriptions,
      enabled: pushState.enabled,
      skippedReason: pushState.skippedReason,
      fallbackUsed: pushState.fallbackUsed,
      endpoint: 'vk_group_webhook',
    },
  })

  if (!pushState.enabled) {
    await logPublicLeadPushSkipped({
      tenantId,
      event,
      reason: pushState.skippedReason,
      configured: configuredPushEnabled,
      activeSubscriptions: pushState.activeSubscriptions,
      fallbackUsed: pushState.fallbackUsed,
    })
    return { enabled: false, skippedReason: pushState.skippedReason }
  }

  try {
    return await notifyApiLeadCreated({
      tenantId,
      event,
      normalizedData: {
        phone: normalized.phone,
        source: 'VK',
      },
    })
  } catch (error) {
    await logPublicLeadPushError({ tenantId, event, error })
    return { enabled: true, sent: 0, failed: 1, skippedReason: 'notify_error' }
  }
}

const createOrUpdateVkLead = async ({ tenantId, siteSettings, body }) => {
  const normalized = normalizeVkWebhookPayload(body)
  if (!normalized.vkPeerId && !normalized.comment) {
    return { ok: false, status: 400, error: 'empty_vk_message' }
  }

  const linkedClientId = await findClientForVkConversation({
    tenantId,
    normalized,
  })

  const existingEvent = normalized.vkPeerId
    ? await Events.findOne({
        tenantId,
        'clientData.lead.source': 'vk_group',
        'clientData.lead.vkPeerId': normalized.vkPeerId,
      })
    : null

  if (existingEvent) {
    const conversation = await upsertVkConversation({
      tenantId,
      normalized,
      rawPayload: body,
      clientId: existingEvent.clientId ?? linkedClientId,
      eventId: existingEvent._id,
    })
    await saveIncomingVkMessage({
      tenantId,
      conversation,
      normalized,
      rawPayload: body,
    })
    const event = await appendMessageToExistingEvent({
      event: existingEvent,
      normalized,
      rawPayload: body,
    })
    return { ok: true, event, created: false, normalized }
  }

  const event = await createPublicLeadDraftEvent({
    tenantId,
    clientId: linkedClientId,
    normalizedData: {
      ...normalized,
      source: 'vk_group',
      sourceLabel: 'VK',
      raw: undefined,
    },
    rawPayload: body,
    historyUserId: 'vk-group-webhook',
    apiKeyData: {
      id: 'vk_group',
      name: 'VK',
    },
  })

  const conversation = await upsertVkConversation({
    tenantId,
    normalized,
    rawPayload: body,
    clientId: linkedClientId,
    eventId: event._id,
  })
  await saveIncomingVkMessage({
    tenantId,
    conversation,
    normalized,
    rawPayload: body,
  })
  await notifyVkLead({ tenantId, event, normalized, siteSettings })

  return {
    ok: true,
    event,
    clientId: linkedClientId,
    conversation,
    created: true,
    normalized,
  }
}

const updateVkCustom = async ({ tenantId, patch }) => {
  const current = await SiteSettings.findOne({ tenantId }).lean()
  const custom = current?.custom ?? {}
  const nextCustom = {
    ...(typeof custom?.get === 'function' ? Object.fromEntries(custom) : custom),
    ...patch,
  }

  return SiteSettings.findOneAndUpdate(
    { tenantId },
    { $set: { tenantId, custom: nextCustom } },
    { upsert: true, returnDocument: 'after' }
  ).lean()
}

export {
  buildVkWebhookUrl,
  checkVkGroupAccess,
  createOrUpdateVkLead,
  createVkWebhookSecret,
  createVkWebhookToken,
  normalizeVkSettings,
  sendVkMessage,
  updateVkCustom,
}
