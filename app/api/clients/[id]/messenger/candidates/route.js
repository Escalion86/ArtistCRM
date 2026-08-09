import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import AvitoConversations from '@models/AvitoConversations'
import AvitoMessages from '@models/AvitoMessages'
import Clients from '@models/Clients'
import VkConversations from '@models/VkConversations'
import VkMessages from '@models/VkMessages'
import TelegramConversations from '@models/TelegramConversations'
import TelegramMessages from '@models/TelegramMessages'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  getIntegrationAccessError,
  hasIntegrationAccess,
} from '@server/integrationAccess'

const isObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(String(value)))

const jsonError = (message, status = 400, code = 'messenger_candidates_error') =>
  NextResponse.json(
    { success: false, error: { code, type: 'messenger', message } },
    { status }
  )

const normalizeConversation = (provider, conversation) => ({
  _id: String(conversation._id),
  provider,
  providerLabel:
    provider === 'avito' ? 'Avito' : provider === 'vk' ? 'VK' : 'Telegram',
  clientId: conversation.clientId ? String(conversation.clientId) : '',
  linkedToCurrentClient: Boolean(conversation.clientId),
  title:
    provider === 'avito'
      ? conversation.avitoItemTitle || conversation.clientName || 'Чат Avito'
      : provider === 'vk'
        ? conversation.clientName || 'Чат VK'
        : conversation.clientName || 'Чат Telegram',
  subtitle:
    conversation.lastMessageText ||
    (provider === 'avito'
      ? conversation.avitoChatId
      : provider === 'vk'
        ? conversation.vkPeerId
        : conversation.telegramUsername || conversation.telegramChatId) ||
    '',
  externalId:
    provider === 'avito'
      ? conversation.avitoChatId
      : provider === 'vk'
        ? conversation.vkPeerId
        : conversation.telegramChatId,
  lastMessageText: conversation.lastMessageText || '',
  lastMessageAt: conversation.lastMessageAt || null,
  unreadCount: conversation.unreadCount || 0,
})

const loadCandidates = async ({ tenantId, clientId, access }) => {
  const query = {
    tenantId,
    $or: [{ clientId: null }, { clientId: { $exists: false } }, { clientId }],
  }

  const [avitoConversations, vkConversations, telegramConversations] =
    await Promise.all([
    hasIntegrationAccess(access, 'avito')
      ? AvitoConversations.find(query)
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    hasIntegrationAccess(access, 'vk')
      ? VkConversations.find(query)
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    hasIntegrationAccess(access, 'telegram')
      ? TelegramConversations.find(query)
          .sort({ lastMessageAt: -1, updatedAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
  ])

  return [
    ...avitoConversations.map((item) => normalizeConversation('avito', item)),
    ...vkConversations.map((item) => normalizeConversation('vk', item)),
    ...telegramConversations.map((item) =>
      normalizeConversation('telegram', item)
    ),
  ].sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
  )
}

const ensureClientInTenant = async ({ tenantId, clientId }) => {
  const client = await Clients.findOne({ _id: clientId, tenantId })
    .select('_id')
    .lean()
  return Boolean(client)
}

export const GET = async (req, { params }) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return jsonError('Не авторизован', 401, 'unauthorized')

  const routeParams = await params
  const clientId = String(routeParams?.id || '').trim()
  if (!isObjectId(clientId)) return jsonError('Некорректный ID клиента', 400, 'bad_id')

  await dbConnect()
  const access = await getUserTariffAccess(tenantId)
  const clientExists = await ensureClientInTenant({ tenantId, clientId })
  if (!clientExists) return jsonError('Клиент не найден', 404, 'client_not_found')

  const conversations = await loadCandidates({ tenantId, clientId, access })

  return NextResponse.json(
    { success: true, data: { conversations } },
    { status: 200 }
  )
}

export const PATCH = async (req, { params }) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return jsonError('Не авторизован', 401, 'unauthorized')

  const routeParams = await params
  const clientId = String(routeParams?.id || '').trim()
  if (!isObjectId(clientId)) return jsonError('Некорректный ID клиента', 400, 'bad_id')

  const body = await req.json().catch(() => ({}))
  const provider = String(body?.provider || '').trim().toLowerCase()
  const conversationId = String(body?.conversationId || '').trim()
  const linked = body?.linked === true

  if (!['avito', 'vk', 'telegram'].includes(provider)) {
    return jsonError('Некорректный источник переписки', 400, 'bad_provider')
  }
  if (!isObjectId(conversationId)) {
    return jsonError('Некорректный ID переписки', 400, 'bad_conversation_id')
  }

  await dbConnect()
  const access = await getUserTariffAccess(tenantId)
  if (!hasIntegrationAccess(access, provider)) {
    return jsonError(
      getIntegrationAccessError(provider),
      403,
      'tariff_required'
    )
  }
  const clientExists = await ensureClientInTenant({ tenantId, clientId })
  if (!clientExists) return jsonError('Клиент не найден', 404, 'client_not_found')

  const ConversationModel =
    provider === 'avito'
      ? AvitoConversations
      : provider === 'vk'
        ? VkConversations
        : TelegramConversations
  const MessageModel =
    provider === 'avito'
      ? AvitoMessages
      : provider === 'vk'
        ? VkMessages
        : TelegramMessages

  const current = await ConversationModel.findOne({
    _id: conversationId,
    tenantId,
  }).lean()
  if (!current) return jsonError('Переписка не найдена', 404, 'not_found')

  const currentClientId = current.clientId ? String(current.clientId) : ''
  if (currentClientId && currentClientId !== clientId) {
    return jsonError(
      'Переписка уже привязана к другому клиенту',
      409,
      'linked_to_other_client'
    )
  }

  const nextClientId = linked ? clientId : null
  await Promise.all([
    ConversationModel.updateOne(
      { _id: conversationId, tenantId },
      { $set: { clientId: nextClientId } }
    ),
    MessageModel.updateMany(
      { tenantId, conversationId },
      { $set: { clientId: nextClientId } }
    ),
  ])

  const conversations = await loadCandidates({ tenantId, clientId, access })

  return NextResponse.json(
    { success: true, data: { conversations } },
    { status: 200 }
  )
}
