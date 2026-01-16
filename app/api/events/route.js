import { NextResponse } from 'next/server'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'
import { updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'

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
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const event = await Events.create({ ...body, tenantId })
  let responseEvent = event
  if (!event?.importedFromCalendar) {
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
