import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import AvitoConversations from '@models/AvitoConversations'
import AvitoMessages from '@models/AvitoMessages'
import VkConversations from '@models/VkConversations'
import VkMessages from '@models/VkMessages'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import {
  normalizeAvitoSettings,
  requestAvitoAccessToken,
  sendAvitoMessage,
} from '@server/avito'
import { normalizeVkSettings, sendVkMessage } from '@server/vkGroup'

const isObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(String(value)))

const jsonError = (message, status = 400, code = 'messenger_error') =>
  NextResponse.json(
    { success: false, error: { code, type: 'messenger', message } },
    { status }
  )

const normalizeConversation = (provider, conversation) => ({
  _id: String(conversation._id),
  provider,
  providerLabel: provider === 'avito' ? 'Avito' : 'VK',
  clientId: conversation.clientId ? String(conversation.clientId) : '',
  eventId: conversation.eventId ? String(conversation.eventId) : '',
  lastMessageText: conversation.lastMessageText || '',
  lastMessageAt: conversation.lastMessageAt || null,
  unreadCount: conversation.unreadCount || 0,
})

const normalizeMessage = (provider, message) => ({
  _id: String(message._id),
  conversationId: String(message.conversationId),
  provider,
  providerLabel: provider === 'avito' ? 'Avito' : 'VK',
  direction: message.direction,
  text: message.text || '',
  attachments: Array.isArray(message.attachments) ? message.attachments : [],
  sentAt: message.sentAt || message.createdAt || null,
  createdAt: message.createdAt || null,
  status: message.status || '',
})

const loadClientMessenger = async ({ tenantId, clientId, summary = false }) => {
  const [avitoConversations, vkConversations] = await Promise.all([
    AvitoConversations.find({ tenantId, clientId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .lean(),
    VkConversations.find({ tenantId, clientId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100)
      .lean(),
  ])

  const conversations = [
    ...avitoConversations.map((item) => normalizeConversation('avito', item)),
    ...vkConversations.map((item) => normalizeConversation('vk', item)),
  ].sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
  )

  if (summary) {
    return {
      conversations,
      messages: [],
      defaultConversationId: conversations[0]?._id || '',
      defaultProvider: conversations[0]?.provider || '',
    }
  }

  const [avitoMessages, vkMessages] = await Promise.all([
    avitoConversations.length
      ? AvitoMessages.find({
          tenantId,
          conversationId: { $in: avitoConversations.map((item) => item._id) },
        })
          .sort({ sentAt: 1, createdAt: 1 })
          .limit(500)
          .lean()
      : Promise.resolve([]),
    vkConversations.length
      ? VkMessages.find({
          tenantId,
          conversationId: { $in: vkConversations.map((item) => item._id) },
        })
          .sort({ sentAt: 1, createdAt: 1 })
          .limit(500)
          .lean()
      : Promise.resolve([]),
  ])

  const messages = [
    ...avitoMessages.map((item) => normalizeMessage('avito', item)),
    ...vkMessages.map((item) => normalizeMessage('vk', item)),
  ].sort(
    (a, b) =>
      new Date(a.sentAt || a.createdAt || 0).getTime() -
      new Date(b.sentAt || b.createdAt || 0).getTime()
  )

  const lastIncoming = [...messages]
    .reverse()
    .find((item) => item.direction === 'incoming')
  const lastAny = messages[messages.length - 1]

  return {
    conversations,
    messages,
    defaultConversationId:
      lastIncoming?.conversationId || lastAny?.conversationId || conversations[0]?._id || '',
    defaultProvider:
      lastIncoming?.provider || lastAny?.provider || conversations[0]?.provider || '',
  }
}

export const GET = async (req, { params }) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return jsonError('Не авторизован', 401, 'unauthorized')

  const routeParams = await params
  const clientId = String(routeParams?.id || '').trim()
  if (!isObjectId(clientId)) return jsonError('Некорректный ID клиента', 400, 'bad_id')

  const { searchParams } = new URL(req.url)
  const summary = searchParams.get('summary') === '1'

  await dbConnect()
  const data = await loadClientMessenger({ tenantId, clientId, summary })

  return NextResponse.json({ success: true, data }, { status: 200 })
}

export const POST = async (req, { params }) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return jsonError('Не авторизован', 401, 'unauthorized')

  const routeParams = await params
  const clientId = String(routeParams?.id || '').trim()
  if (!isObjectId(clientId)) return jsonError('Некорректный ID клиента', 400, 'bad_id')

  const body = await req.json().catch(() => ({}))
  const provider = String(body?.provider || '').trim().toLowerCase()
  const conversationId = String(body?.conversationId || '').trim()
  const text = String(body?.text || '').trim().slice(0, 4000)

  if (!['avito', 'vk'].includes(provider)) {
    return jsonError('Выберите чат для ответа', 400, 'bad_provider')
  }
  if (!isObjectId(conversationId)) {
    return jsonError('Некорректный ID переписки', 400, 'bad_conversation_id')
  }
  if (!text) return jsonError('Введите текст сообщения', 400, 'empty_text')

  await dbConnect()

  if (provider === 'avito') {
    const conversation = await AvitoConversations.findOne({
      _id: conversationId,
      tenantId,
      clientId,
    })
    if (!conversation) return jsonError('Переписка Avito не найдена', 404, 'not_found')

    const siteSettings = await SiteSettings.findOne({ tenantId }).lean()
    const avito = normalizeAvitoSettings(siteSettings?.custom)
    if (!avito.enabled || !avito.clientId || !avito.clientSecret) {
      return jsonError('Avito не подключен', 403, 'not_connected')
    }
    if (!avito.userId) {
      return jsonError('Укажите Avito User ID в настройках интеграции', 400, 'missing_user_id')
    }

    let sendResult = null
    try {
      const tokenPayload = await requestAvitoAccessToken({
        clientId: avito.clientId,
        clientSecret: avito.clientSecret,
      })
      sendResult = await sendAvitoMessage({
        accessToken: tokenPayload.access_token,
        userId: avito.userId,
        chatId: conversation.avitoChatId,
        text,
      })
    } catch (error) {
      return jsonError('Не удалось получить доступ Avito', 400, 'auth_error')
    }

    const now = new Date()
    const message = await AvitoMessages.create({
      tenantId,
      conversationId: conversation._id,
      clientId: conversation.clientId ?? null,
      eventId: conversation.eventId ?? null,
      avitoChatId: conversation.avitoChatId,
      avitoMessageId:
        sendResult?.payload?.id || sendResult?.payload?.message_id || '',
      direction: 'outgoing',
      text,
      sentAt: now,
      status: sendResult?.ok ? 'sent' : 'failed',
      raw: sendResult?.payload ?? null,
    })

    conversation.lastMessageText = text
    conversation.lastMessageAt = now
    await conversation.save()

    if (!sendResult?.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'send_failed',
            type: 'messenger',
            message: sendResult?.error || 'Avito не принял сообщение',
          },
          data: { message: normalizeMessage('avito', message) },
        },
        { status: 400 }
      )
    }

    const data = await loadClientMessenger({ tenantId, clientId })
    return NextResponse.json({ success: true, data }, { status: 201 })
  }

  const conversation = await VkConversations.findOne({
    _id: conversationId,
    tenantId,
    clientId,
  })
  if (!conversation) return jsonError('Переписка VK не найдена', 404, 'not_found')

  const siteSettings = await SiteSettings.findOne({ tenantId }).lean()
  const vkGroup = normalizeVkSettings(siteSettings?.custom)
  if (!vkGroup.enabled || !vkGroup.accessToken) {
    return jsonError('VK-группа не подключена', 403, 'not_connected')
  }

  const sendResult = await sendVkMessage({
    accessToken: vkGroup.accessToken,
    peerId: conversation.vkPeerId,
    text,
  })

  const now = new Date()
  const message = await VkMessages.create({
    tenantId,
    conversationId: conversation._id,
    clientId: conversation.clientId ?? null,
    eventId: conversation.eventId ?? null,
    vkPeerId: conversation.vkPeerId,
    vkMessageId: sendResult?.payload ? String(sendResult.payload) : '',
    vkUserId: conversation.vkUserId || '',
    direction: 'outgoing',
    text,
    sentAt: now,
    status: sendResult?.ok ? 'sent' : 'failed',
    raw: sendResult?.payload ?? null,
  })

  conversation.lastMessageText = text
  conversation.lastMessageAt = now
  await conversation.save()

  if (!sendResult?.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'send_failed',
          type: 'messenger',
          message: sendResult?.error || 'VK не принял сообщение',
        },
        data: { message: normalizeMessage('vk', message) },
      },
      { status: 400 }
    )
  }

  const data = await loadClientMessenger({ tenantId, clientId })
  return NextResponse.json({ success: true, data }, { status: 201 })
}
