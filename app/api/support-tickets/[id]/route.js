import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import SupportTickets from '@models/SupportTickets'
import SupportTicketMessages from '@models/SupportTicketMessages'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  SUPPORT_STATUSES,
  buildSupportTicketAccessQuery,
  isSupportDeveloper,
  serializeSupportMessage,
  serializeSupportTicket,
} from '@server/supportTickets'

const errorResponse = (code, message, status = 400) =>
  NextResponse.json({ success: false, error: { code, message } }, { status })

const parseCursor = (value) => {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    const date = new Date(parsed?.date)
    if (Number.isNaN(date.getTime()) || !mongoose.Types.ObjectId.isValid(parsed?.id)) return null
    return { date, id: new mongoose.Types.ObjectId(parsed.id) }
  } catch { return null }
}

const makeCursor = (message) =>
  Buffer.from(JSON.stringify({ date: message.createdAt, id: String(message._id) })).toString('base64url')

export const GET = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId) return errorResponse('UNAUTHORIZED', 'Не авторизован', 401)
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse('NOT_FOUND', 'Тикет не найден', 404)
  const { searchParams } = new URL(req.url)
  const cursor = parseCursor(searchParams.get('cursor'))
  const messageQuery = { ticketId: id }
  if (cursor) {
    messageQuery.$or = [
      { createdAt: { $lt: cursor.date } },
      { createdAt: cursor.date, _id: { $lt: cursor.id } },
    ]
  }
  await dbConnect()
  const ticket = await SupportTickets.findOne(buildSupportTicketAccessQuery(context, id)).lean()
  if (!ticket) return errorResponse('NOT_FOUND', 'Тикет не найден', 404)
  const rows = await SupportTicketMessages.find(messageQuery)
    .sort({ createdAt: -1, _id: -1 })
    .limit(51)
    .lean()
  const hasMore = rows.length > 50
  const selected = hasMore ? rows.slice(0, 50) : rows
  const oldest = selected[selected.length - 1]
  return NextResponse.json({
    success: true,
    data: {
      ticket: serializeSupportTicket(ticket, isSupportDeveloper(context)),
      messages: selected.reverse().map(serializeSupportMessage),
    },
    meta: { hasMore, nextCursor: hasMore && oldest ? makeCursor(oldest) : null },
  })
}

export const PATCH = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId) return errorResponse('UNAUTHORIZED', 'Не авторизован', 401)
  if (!isSupportDeveloper(context)) return errorResponse('FORBIDDEN', 'Нет доступа', 403)
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const status = String(body?.status || '')
  if (!mongoose.Types.ObjectId.isValid(id) || !SUPPORT_STATUSES.has(status)) {
    return errorResponse('VALIDATION_ERROR', 'Некорректный статус')
  }
  await dbConnect()
  const ticket = await SupportTickets.findByIdAndUpdate(
    id,
    { $set: { status, resolvedAt: status === 'resolved' ? new Date() : null } },
    { returnDocument: 'after' }
  ).lean()
  if (!ticket) return errorResponse('NOT_FOUND', 'Тикет не найден', 404)
  return NextResponse.json({ success: true, data: serializeSupportTicket(ticket, true) })
}
