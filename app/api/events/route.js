import { NextResponse } from 'next/server'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'
import { updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'

const hasDocuments = (payload) => {
  const invoiceLinks = Array.isArray(payload?.invoiceLinks)
    ? payload.invoiceLinks
    : []
  const receiptLinks = Array.isArray(payload?.receiptLinks)
    ? payload.receiptLinks
    : []
  return (
    invoiceLinks.some((item) => Boolean(item)) ||
    receiptLinks.some((item) => Boolean(item))
  )
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
  const events = await Events.find({ tenantId })
    .sort({ eventDate: -1, createdAt: -1 })
    .lean()
  return NextResponse.json({ success: true, data: events }, { status: 200 })
}

export const POST = async (req) => {
  const body = await req.json()
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  const access = await getUserTariffAccess(user._id)
  if (!access?.trialActive && !access?.hasTariff) {
    return NextResponse.json(
      { success: false, error: 'Не выбран тариф' },
      { status: 403 }
    )
  }
  if (!access?.allowDocuments && hasDocuments(body)) {
    return NextResponse.json(
      { success: false, error: 'Доступ к документам недоступен' },
      { status: 403 }
    )
  }
  await dbConnect()
  if (Number.isFinite(access?.eventsPerMonth) && access.eventsPerMonth > 0) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const count = await Events.countDocuments({
      tenantId,
      createdAt: { $gte: start, $lt: end },
    })
    if (count >= access.eventsPerMonth) {
      return NextResponse.json(
        { success: false, error: 'Достигнут лимит мероприятий' },
        { status: 403 }
      )
    }
  }
  const event = await Events.create({ ...body, tenantId })
  let responseEvent = event
  if (!event?.importedFromCalendar && access?.allowCalendarSync) {
    try {
      await updateEventInCalendar(event, req)
      const refreshed = await Events.findById(event._id).lean()
      if (refreshed) responseEvent = refreshed
    } catch (error) {
      console.log('Google Calendar create error', error)
    }
  }
  return NextResponse.json({ success: true, data: responseEvent }, { status: 201 })
}
