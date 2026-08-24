import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import AvitoConversations from '@models/AvitoConversations'
import Calls from '@models/Calls'
import Clients from '@models/Clients'
import Events from '@models/Events'
import TelegramConversations from '@models/TelegramConversations'
import VkConversations from '@models/VkConversations'
import getPersonFullName from '@helpers/getPersonFullName'
import { mergeUnreadConversations } from '@helpers/messengerAttention'
import { mergeMessengerUnreadGroups } from '@helpers/messengerUnreadSummary'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import { hasIntegrationAccess } from '@server/integrationAccess'

const conversationPipeline = (tenantId) => [
  { $match: { tenantId, clientId: { $ne: null } } },
  {
    $group: {
      _id: '$clientId',
      conversationCount: { $sum: 1 },
      unreadCount: { $sum: { $ifNull: ['$unreadCount', 0] } },
    },
  },
]

const callsPipeline = (tenantId) => [
  { $match: { tenantId, linkedClientId: { $ne: null } } },
  {
    $group: {
      _id: '$linkedClientId',
      conversationCount: { $first: 1 },
      unreadCount: { $first: 0 },
    },
  },
]

const unreadConversationQuery = (tenantId) => ({
  tenantId,
  status: 'open',
  unreadCount: { $gt: 0 },
})

const loadUnreadConversations = (Model, tenantId) =>
  Model.find(unreadConversationQuery(tenantId))
    .select(
      '_id clientId eventId clientName unreadCount lastMessageText lastMessageAt'
    )
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .lean()

const toObjectIds = (values) =>
  Array.from(new Set(values.filter(Boolean))).flatMap((value) =>
    mongoose.Types.ObjectId.isValid(value)
      ? [mongoose.Types.ObjectId.createFromHexString(value)]
      : []
  )

const enrichUnreadItems = async ({ tenantObjectId, groups }) => {
  const unreadItems = mergeUnreadConversations(groups)
  if (unreadItems.length === 0) return []

  const clientObjectIds = toObjectIds(unreadItems.map((item) => item.clientId))
  const associatedEventObjectIds = toObjectIds(
    unreadItems.flatMap((item) => item.eventIds)
  )
  const [clients, nearestEvents, associatedEvents] = await Promise.all([
    clientObjectIds.length > 0
      ? Clients.find({ tenantId: tenantObjectId, _id: { $in: clientObjectIds } })
          .select('_id firstName secondName thirdName')
          .lean()
      : [],
    clientObjectIds.length > 0
      ? Events.aggregate([
          {
            $match: {
              tenantId: tenantObjectId,
              clientId: { $in: clientObjectIds },
              status: { $nin: ['canceled', 'closed'] },
              eventDate: { $gte: new Date() },
            },
          },
          { $sort: { clientId: 1, eventDate: 1, createdAt: 1 } },
          { $group: { _id: '$clientId', event: { $first: '$$ROOT' } } },
          {
            $project: {
              _id: 0,
              clientId: '$_id',
              event: {
                _id: '$event._id',
                eventType: '$event.eventType',
                eventDate: '$event.eventDate',
                status: '$event.status',
              },
            },
          },
        ])
      : [],
    associatedEventObjectIds.length > 0
      ? Events.find({
          tenantId: tenantObjectId,
          _id: { $in: associatedEventObjectIds },
        })
          .select('_id eventType eventDate status clientId')
          .lean()
      : [],
  ])

  const clientsById = new Map(
    clients.map((client) => [String(client._id), client])
  )
  const nearestByClientId = new Map(
    nearestEvents.map((item) => [String(item.clientId), item.event])
  )
  const eventsById = new Map(
    associatedEvents.map((event) => [String(event._id), event])
  )

  return unreadItems.map((item) => {
    const client = clientsById.get(item.clientId)
    const event =
      nearestByClientId.get(item.clientId) ||
      item.eventIds.map((eventId) => eventsById.get(eventId)).find(Boolean) ||
      null
    return {
      key: item.key,
      clientId: item.clientId,
      clientName: getPersonFullName(client, {
        fallback: item.clientName || 'Клиент',
      }),
      unreadCount: item.unreadCount,
      providers: item.providers,
      lastMessageText: item.lastMessageText,
      lastMessageAt: item.lastMessageAt,
      event: event
        ? {
            _id: String(event._id),
            eventType: event.eventType || '',
            eventDate: event.eventDate || null,
            status: event.status || '',
          }
        : null,
    }
  })
}

export const GET = async () => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  await dbConnect()
  const access = await getUserTariffAccess(tenantId)
  const tenantObjectId = mongoose.Types.ObjectId.createFromHexString(tenantId)
  const allowAvito = hasIntegrationAccess(access, 'avito')
  const allowVk = hasIntegrationAccess(access, 'vk')
  const allowTelegram = hasIntegrationAccess(access, 'telegram')
  const allowTelephony = hasIntegrationAccess(access, 'telephony')
  const [avito, vk, telegram, calls, avitoUnread, vkUnread, telegramUnread] =
    await Promise.all([
    allowAvito
      ? AvitoConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    allowVk
      ? VkConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    allowTelegram
      ? TelegramConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    allowTelephony
      ? Calls.aggregate(callsPipeline(tenantObjectId))
      : [],
    allowAvito ? loadUnreadConversations(AvitoConversations, tenantObjectId) : [],
    allowVk ? loadUnreadConversations(VkConversations, tenantObjectId) : [],
    allowTelegram
      ? loadUnreadConversations(TelegramConversations, tenantObjectId)
      : [],
  ])
  const unreadItems = await enrichUnreadItems({
    tenantObjectId,
    groups: [
      { provider: 'avito', items: avitoUnread },
      { provider: 'vk', items: vkUnread },
      { provider: 'telegram', items: telegramUnread },
    ],
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        byClientId: mergeMessengerUnreadGroups([avito, vk, telegram, calls]),
        unreadItems,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
