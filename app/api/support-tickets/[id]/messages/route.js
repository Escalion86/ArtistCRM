import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import SupportTickets from '@models/SupportTickets'
import SupportTicketMessages from '@models/SupportTicketMessages'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { checkRateLimit, rateLimitResponse } from '@server/rateLimit'
import {
  buildSupportTicketAccessQuery,
  buildSupportReplyTicketUpdate,
  getSupportActorLabel,
  isSupportDeveloper,
  notifySupportMessage,
  serializeSupportMessage,
  serializeSupportTicket,
  uploadSupportAttachments,
  validateSupportFiles,
  validateSupportText,
} from '@server/supportTickets'

const errorResponse = (code, message, status = 400) =>
  NextResponse.json({ success: false, error: { code, message } }, { status })

export const POST = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context?.tenantId || !context?.user?._id) return errorResponse('UNAUTHORIZED', 'Не авторизован', 401)
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse('NOT_FOUND', 'Тикет не найден', 404)
  const rateLimit = await checkRateLimit({
    req,
    scope: 'support_ticket_reply',
    limit: 60,
    windowMs: 60 * 60 * 1000,
    keyParts: [context.tenantId, context.user._id],
  })
  if (!rateLimit.ok) return rateLimitResponse(NextResponse, rateLimit)
  await dbConnect()
  const ticket = await SupportTickets.findOne(buildSupportTicketAccessQuery(context, id)).lean()
  if (!ticket) return errorResponse('NOT_FOUND', 'Тикет не найден', 404)

  const form = await req.formData().catch(() => null)
  if (!form) return errorResponse('INVALID_FORM', 'Некорректная форма')
  const files = form.getAll('files')
  const validation = validateSupportText({ body: form.get('message'), requireTitle: false })
  if (!validation.ok) return errorResponse('VALIDATION_ERROR', validation.error)
  const fileValidation = await validateSupportFiles(files)
  if (!fileValidation.ok) return errorResponse('FILE_VALIDATION_ERROR', fileValidation.error)

  let attachments = []
  try {
    attachments = await uploadSupportAttachments({ files, tenantId: ticket.tenantId, ticketId: id })
  } catch (error) {
    console.warn('support attachment upload failed', { ticketId: id, error: error?.message })
    return errorResponse('FILE_UPLOAD_FAILED', 'Не удалось загрузить изображения', 502)
  }

  const actorRole = isSupportDeveloper(context) ? 'developer' : 'user'
  const actorLabel = getSupportActorLabel(context.user)
  const now = new Date()
  let message = null
  try {
    message = await SupportTicketMessages.create({
      ticketId: id,
      tenantId: ticket.tenantId,
      authorId: context.user._id,
      authorRole: actorRole,
      authorLabel: actorLabel,
      body: validation.body,
      attachments,
    })
    const set = buildSupportReplyTicketUpdate({ actorRole, currentStatus: ticket.status, now })
    const updated = await SupportTickets.findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' }).lean()
    if (!updated) throw new Error('TICKET_UPDATE_FAILED')
    await notifySupportMessage({ ticket: updated, actorRole })
    return NextResponse.json({
      success: true,
      data: {
        ticket: serializeSupportTicket(updated, isSupportDeveloper(context)),
        message: serializeSupportMessage(message.toObject()),
      },
    }, { status: 201 })
  } catch (error) {
    if (message) await SupportTicketMessages.deleteOne({ _id: message._id }).catch(() => null)
    console.error('support reply failed', { ticketId: id, error: error?.message })
    return errorResponse('CREATE_FAILED', 'Не удалось отправить сообщение', 500)
  }
}
