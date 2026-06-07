import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import VkConversations from '@models/VkConversations'
import Clients from '@models/Clients'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

const isObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(String(value)))

const jsonError = (message, status = 400, code = 'vk_error') =>
  NextResponse.json(
    { success: false, error: { code, type: 'vk_group', message } },
    { status }
  )

export const PATCH = async (req, { params }) => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return jsonError('Не авторизован', 401, 'unauthorized')

  const routeParams = await params
  const id = String(routeParams?.id || '').trim()
  if (!isObjectId(id)) return jsonError('Некорректный ID переписки', 400, 'bad_id')

  const body = await req.json().catch(() => ({}))
  await dbConnect()

  const update = {}
  if (body.clientId !== undefined) {
    if (!body.clientId) {
      update.clientId = null
    } else if (isObjectId(body.clientId)) {
      const client = await Clients.findOne({ _id: body.clientId, tenantId })
        .select('_id')
        .lean()
      if (!client) return jsonError('Клиент не найден', 404, 'client_not_found')
      update.clientId = body.clientId
    } else {
      return jsonError('Некорректный ID клиента', 400, 'bad_client_id')
    }
  }
  if (body.eventId !== undefined) {
    if (!body.eventId) {
      update.eventId = null
    } else if (isObjectId(body.eventId)) {
      const event = await Events.findOne({ _id: body.eventId, tenantId })
        .select('_id')
        .lean()
      if (!event) return jsonError('Мероприятие не найдено', 404, 'event_not_found')
      update.eventId = body.eventId
    } else {
      return jsonError('Некорректный ID мероприятия', 400, 'bad_event_id')
    }
  }
  if (body.status !== undefined) {
    const status = String(body.status || '').trim()
    if (['open', 'closed', 'ignored'].includes(status)) update.status = status
  }
  if (body.markRead === true) update.unreadCount = 0

  const conversation = await VkConversations.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: update },
    { returnDocument: 'after' }
  ).lean()

  if (!conversation) return jsonError('Переписка не найдена', 404, 'not_found')

  return NextResponse.json(
    { success: true, data: conversation },
    { status: 200 }
  )
}
