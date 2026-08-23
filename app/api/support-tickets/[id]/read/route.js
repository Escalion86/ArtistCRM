import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import SupportTickets from '@models/SupportTickets'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { buildSupportTicketAccessQuery, isSupportDeveloper, serializeSupportTicket } from '@server/supportTickets'

export const POST = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Не авторизован' } }, { status: 401 })
  }
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Тикет не найден' } }, { status: 404 })
  }
  const developer = isSupportDeveloper(context)
  const field = developer ? 'developerLastReadAt' : 'userLastReadAt'
  await dbConnect()
  const ticket = await SupportTickets.findOneAndUpdate(
    buildSupportTicketAccessQuery(context, id),
    { $set: { [field]: new Date() } },
    { returnDocument: 'after' }
  ).lean()
  if (!ticket) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Тикет не найден' } }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: serializeSupportTicket(ticket, developer) })
}
