import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import AvitoConversations from '@models/AvitoConversations'
import Calls from '@models/Calls'
import TelegramConversations from '@models/TelegramConversations'
import VkConversations from '@models/VkConversations'
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
  const [avito, vk, telegram, calls] = await Promise.all([
    hasIntegrationAccess(access, 'avito')
      ? AvitoConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    hasIntegrationAccess(access, 'vk')
      ? VkConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    hasIntegrationAccess(access, 'telegram')
      ? TelegramConversations.aggregate(conversationPipeline(tenantObjectId))
      : [],
    hasIntegrationAccess(access, 'telephony')
      ? Calls.aggregate(callsPipeline(tenantObjectId))
      : [],
  ])

  return NextResponse.json(
    {
      success: true,
      data: { byClientId: mergeMessengerUnreadGroups([avito, vk, telegram, calls]) },
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  )
}
