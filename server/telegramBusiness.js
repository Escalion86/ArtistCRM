import crypto from 'crypto'
import dns from 'dns'
import {
  Agent as UndiciAgent,
  ProxyAgent,
  Socks5ProxyAgent,
} from 'undici'
import Clients from '@models/Clients'
import SiteSettings from '@models/SiteSettings'
import TelegramConversations from '@models/TelegramConversations'
import TelegramMessages from '@models/TelegramMessages'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000
const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000

const lookupIPv4 = (hostname, options, callback) => {
  if (typeof options === 'function') {
    return dns.lookup(hostname, { family: 4 }, options)
  }
  return dns.lookup(hostname, { ...(options || {}), family: 4 }, callback)
}

const createTelegramTransport = () => {
  const proxyUrl = String(process.env.TELEGRAM_PROXY_URL || '').trim()
  if (!proxyUrl) {
    return {
      dispatcher: new UndiciAgent({
        connect: { lookup: lookupIPv4, family: 4 },
      }),
      proxyEnabled: false,
      proxyType: 'direct',
      configError: '',
    }
  }

  try {
    const protocol = new URL(proxyUrl).protocol.toLowerCase()
    if (['http:', 'https:'].includes(protocol)) {
      return {
        dispatcher: new ProxyAgent(proxyUrl),
        proxyEnabled: true,
        proxyType: protocol.slice(0, -1),
        configError: '',
      }
    }
    if (['socks5:', 'socks5h:'].includes(protocol)) {
      return {
        dispatcher: new Socks5ProxyAgent(proxyUrl),
        proxyEnabled: true,
        proxyType: protocol.slice(0, -1),
        configError: '',
      }
    }
    return {
      dispatcher: null,
      proxyEnabled: true,
      proxyType: 'invalid',
      configError:
        'TELEGRAM_PROXY_URL поддерживает только http://, https:// и socks5://',
    }
  } catch {
    return {
      dispatcher: null,
      proxyEnabled: true,
      proxyType: 'invalid',
      configError: 'Некорректный формат TELEGRAM_PROXY_URL',
    }
  }
}

const telegramTransport = createTelegramTransport()

export const getTelegramTransportStatus = () => ({
  proxyEnabled: telegramTransport.proxyEnabled,
  proxyType: telegramTransport.proxyType,
  configError: telegramTransport.configError,
})

const readCustom = (custom, key) =>
  typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

const getBaseUrl = (req) => {
  const configured = String(process.env.DOMAIN || '').trim()
  if (configured) {
    return configured.startsWith('http')
      ? configured.replace(/\/$/, '')
      : `https://${configured.replace(/\/$/, '')}`
  }
  return new URL(req.url).origin
}

const telegramRequest = async ({ botToken, method, body = {} }) => {
  if (telegramTransport.configError || !telegramTransport.dispatcher) {
    const error = new Error(telegramTransport.configError)
    error.code = 'telegram_proxy_invalid'
    throw error
  }

  let response
  try {
    response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      dispatcher: telegramTransport.dispatcher,
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    const error = new Error(
      telegramTransport.proxyEnabled
        ? 'Не удалось подключиться к Telegram API через настроенный прокси'
        : 'Сервер не может подключиться к Telegram API'
    )
    error.code = telegramTransport.proxyEnabled
      ? 'telegram_proxy_unavailable'
      : 'telegram_api_unavailable'
    error.cause = cause
    throw error
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.description || 'Telegram API error')
    error.status = response.status
    error.telegramCode = payload?.error_code
    throw error
  }
  return payload?.result
}

export const createTelegramWebhookToken = () =>
  `tgb_${crypto.randomBytes(24).toString('hex')}`

export const createTelegramWebhookSecret = () =>
  `tgsec_${crypto.randomBytes(24).toString('hex')}`

export const buildTelegramWebhookUrl = ({ req, token }) =>
  `${getBaseUrl(req)}/api/integrations/telegram/webhook/${encodeURIComponent(token)}`

export const normalizeTelegramSettings = (custom) => ({
  enabled: Boolean(readCustom(custom, 'telegramBusinessEnabled')),
  botToken: String(readCustom(custom, 'telegramBusinessBotToken') || ''),
  botId: String(readCustom(custom, 'telegramBusinessBotId') || ''),
  botUsername: String(readCustom(custom, 'telegramBusinessBotUsername') || ''),
  webhookToken: String(readCustom(custom, 'telegramBusinessWebhookToken') || ''),
  webhookSecret: String(readCustom(custom, 'telegramBusinessWebhookSecret') || ''),
  webhookUrl: String(readCustom(custom, 'telegramBusinessWebhookUrl') || ''),
  businessConnectionId: String(
    readCustom(custom, 'telegramBusinessConnectionId') || ''
  ),
  businessAccountUserId: String(
    readCustom(custom, 'telegramBusinessAccountUserId') || ''
  ),
  status: String(readCustom(custom, 'telegramBusinessStatus') || 'disabled'),
  lastError: String(readCustom(custom, 'telegramBusinessLastError') || ''),
  connectedAt: readCustom(custom, 'telegramBusinessConnectedAt') || null,
  lastCheckedAt: readCustom(custom, 'telegramBusinessLastCheckedAt') || null,
  lastWebhookAt: readCustom(custom, 'telegramBusinessLastWebhookAt') || null,
  lastMessageAt: readCustom(custom, 'telegramBusinessLastMessageAt') || null,
  rights: readCustom(custom, 'telegramBusinessRights') || null,
})

export const sanitizeTelegramSiteSettings = (siteSettings) => {
  if (!siteSettings) return siteSettings
  const source =
    typeof siteSettings?.toObject === 'function'
      ? siteSettings.toObject()
      : { ...siteSettings }
  const custom = source.custom ?? {}
  const normalizedCustom =
    typeof custom?.get === 'function' ? Object.fromEntries(custom) : { ...custom }
  delete normalizedCustom.telegramBusinessBotToken
  delete normalizedCustom.telegramBusinessWebhookToken
  delete normalizedCustom.telegramBusinessWebhookSecret
  delete normalizedCustom.telegramBusinessWebhookUrl
  delete normalizedCustom.telegramBusinessConnectionId
  delete normalizedCustom.telegramBusinessAccountUserId
  delete normalizedCustom.telegramBusinessRights
  return { ...source, custom: normalizedCustom }
}

export const updateTelegramCustom = async ({ tenantId, patch }) => {
  const current = await SiteSettings.findOne({ tenantId }).lean()
  const custom = current?.custom ?? {}
  const normalizedCustom =
    typeof custom?.get === 'function' ? Object.fromEntries(custom) : custom

  return SiteSettings.findOneAndUpdate(
    { tenantId },
    { $set: { tenantId, custom: { ...normalizedCustom, ...patch } } },
    { upsert: true, returnDocument: 'after' }
  ).lean()
}

export const checkTelegramBot = ({ botToken }) =>
  telegramRequest({ botToken, method: 'getMe' })

export const setTelegramWebhook = ({ botToken, webhookUrl, webhookSecret }) =>
  telegramRequest({
    botToken,
    method: 'setWebhook',
    body: {
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: [
        'business_connection',
        'business_message',
        'edited_business_message',
        'deleted_business_messages',
      ],
      drop_pending_updates: false,
    },
  })

export const deleteTelegramWebhook = ({ botToken }) =>
  telegramRequest({
    botToken,
    method: 'deleteWebhook',
    body: { drop_pending_updates: false },
  })

export const sendTelegramBusinessMessage = ({
  botToken,
  businessConnectionId,
  chatId,
  text,
}) =>
  telegramRequest({
    botToken,
    method: 'sendMessage',
    body: {
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      text,
    },
  })

const normalizeUsername = (value) =>
  String(value || '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, '')
    .replace(/\/$/, '')
    .toLowerCase()

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getMessageText = (message) => {
  const text = String(message?.text || message?.caption || '').trim()
  if (text) return text.slice(0, 4000)
  if (message?.photo) return '[Фото]'
  if (message?.video) return '[Видео]'
  if (message?.voice) return '[Голосовое сообщение]'
  if (message?.audio) return '[Аудио]'
  if (message?.document) return '[Файл]'
  if (message?.sticker) return '[Стикер]'
  if (message?.location) return '[Геопозиция]'
  if (message?.contact) return '[Контакт]'
  return '[Сообщение]'
}

const getAttachments = (message) => {
  const attachments = []
  const push = (type, value) => {
    if (!value?.file_id) return
    attachments.push({
      type,
      fileId: value.file_id,
      fileName: value.file_name || '',
      fileSize: value.file_size || 0,
      mimeType: value.mime_type || '',
    })
  }
  if (Array.isArray(message?.photo) && message.photo.length) {
    push('photo', message.photo[message.photo.length - 1])
  }
  push('video', message?.video)
  push('voice', message?.voice)
  push('audio', message?.audio)
  push('document', message?.document)
  push('sticker', message?.sticker)
  return attachments
}

const findOrCreateTelegramClient = async ({ tenantId, message }) => {
  const peer = message?.chat || message?.from || {}
  const telegramUserId = String(peer?.id || message?.from?.id || '')
  const username = normalizeUsername(peer?.username || message?.from?.username)

  let client = telegramUserId
    ? await Clients.findOne({ tenantId, telegramUserId })
    : null

  if (!client && username) {
    client = await Clients.findOne({
      tenantId,
      telegram: {
        $regex: `^(?:@|https?://(?:www\\.)?(?:t\\.me|telegram\\.me)/)?${escapeRegExp(username)}/?$`,
        $options: 'i',
      },
    })
  }

  if (!client) {
    client = await Clients.create({
      tenantId,
      firstName: String(peer?.first_name || message?.from?.first_name || 'Клиент').slice(
        0,
        100
      ),
      secondName: String(peer?.last_name || message?.from?.last_name || '').slice(
        0,
        100
      ),
      telegram: username,
      telegramUserId,
      role: 'client',
    })
  } else {
    let changed = false
    if (telegramUserId && !client.telegramUserId) {
      client.telegramUserId = telegramUserId
      changed = true
    }
    if (username && !client.telegram) {
      client.telegram = username
      changed = true
    }
    if (changed) await client.save()
  }

  return client
}

export const saveTelegramBusinessMessage = async ({
  tenantId,
  settings,
  message,
}) => {
  const chatId = String(message?.chat?.id || '')
  const messageId = String(message?.message_id || '')
  const connectionId = String(message?.business_connection_id || '')
  if (!chatId || !messageId || !connectionId) return null

  const accountUserId = String(settings?.businessAccountUserId || '')
  const direction =
    message?.sender_business_bot ||
    (accountUserId && String(message?.from?.id || '') === accountUserId)
      ? 'outgoing'
      : 'incoming'
  const client = await findOrCreateTelegramClient({ tenantId, message })
  const sentAt = message?.date ? new Date(Number(message.date) * 1000) : new Date()
  const text = getMessageText(message)
  const username = normalizeUsername(
    message?.chat?.username || message?.from?.username
  )
  const clientName = [
    message?.chat?.first_name || message?.from?.first_name,
    message?.chat?.last_name || message?.from?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 200)
  const existingMessage = await TelegramMessages.exists({
    tenantId,
    telegramChatId: chatId,
    telegramMessageId: messageId,
  })

  const conversation = await TelegramConversations.findOneAndUpdate(
    { tenantId, telegramChatId: chatId },
    {
      $set: {
        clientId: client?._id ?? null,
        businessConnectionId: connectionId,
        telegramUserId: String(message?.chat?.id || message?.from?.id || ''),
        telegramUsername: username,
        clientName,
        lastMessageText: text,
        lastMessageAt: sentAt,
        ...(direction === 'incoming' ? { lastIncomingAt: sentAt } : {}),
      },
      ...(direction === 'incoming' && !existingMessage
        ? { $inc: { unreadCount: 1 } }
        : {}),
      $setOnInsert: { status: 'open' },
    },
    { upsert: true, returnDocument: 'after' }
  )

  const messageStatus = direction === 'incoming' ? 'received' : 'sent'
  const savedMessage = await TelegramMessages.findOneAndUpdate(
    { tenantId, telegramChatId: chatId, telegramMessageId: messageId },
    {
      $set: {
        conversationId: conversation._id,
        clientId: client?._id ?? null,
        eventId: conversation.eventId ?? null,
        businessConnectionId: connectionId,
        direction,
        text,
        attachments: getAttachments(message),
        sentAt,
        status: messageStatus,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )

  return { conversation, message: savedMessage, client, direction }
}

export const isTelegramReplyWindowOpen = (lastIncomingAt, now = Date.now()) => {
  const timestamp = new Date(lastIncomingAt || 0).getTime()
  return Number.isFinite(timestamp) && now - timestamp <= REPLY_WINDOW_MS
}
