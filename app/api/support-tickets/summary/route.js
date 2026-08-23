import { NextResponse } from 'next/server'
import SupportTickets from '@models/SupportTickets'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { buildSupportTicketAccessQuery, isSupportDeveloper } from '@server/supportTickets'

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Не авторизован' } }, { status: 401 })
  }
  const developer = isSupportDeveloper(context)
  const readField = developer ? 'developerLastReadAt' : 'userLastReadAt'
  const expectedRole = developer ? 'user' : 'developer'
  const query = {
    ...buildSupportTicketAccessQuery(context),
    lastMessageByRole: expectedRole,
    $expr: { $lt: [{ $ifNull: [`$${readField}`, new Date(0)] }, '$lastMessageAt'] },
  }
  await dbConnect()
  const unreadCount = await SupportTickets.countDocuments(query)
  return NextResponse.json({ success: true, data: { unreadCount } })
}
