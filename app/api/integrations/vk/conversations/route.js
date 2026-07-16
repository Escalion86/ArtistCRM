import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import VkConversations from '@models/VkConversations'
import dbConnect from '@server/dbConnect'
import { requireTenantIntegrationAccess } from '@server/integrationAccess'

const isObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(String(value)))

export const GET = async (req) => {
  const accessResult = await requireTenantIntegrationAccess('vk', req)
  if (!accessResult.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code:
            accessResult.status === 401 ? 'unauthorized' : 'tariff_required',
          type: accessResult.status === 401 ? 'auth' : 'vk_group',
          message: accessResult.error,
        },
      },
      { status: accessResult.status }
    )
  }
  const { tenantId } = accessResult

  const { searchParams } = new URL(req.url)
  const clientId = String(searchParams.get('clientId') || '').trim()
  const eventId = String(searchParams.get('eventId') || '').trim()

  const query = { tenantId }
  if (isObjectId(clientId)) query.clientId = clientId
  if (isObjectId(eventId)) query.eventId = eventId

  await dbConnect()
  const conversations = await VkConversations.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100)
    .lean()

  return NextResponse.json(
    { success: true, data: conversations },
    { status: 200 }
  )
}
