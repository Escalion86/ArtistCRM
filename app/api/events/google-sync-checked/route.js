import { NextResponse } from 'next/server'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'
import { updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'

export const POST = async (req) => {
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  const access = await getUserTariffAccess(user._id)
  if (!access?.allowCalendarSync) {
    return NextResponse.json(
      { success: false, error: 'Синхронизация с календарем недоступна' },
      { status: 403 }
    )
  }

  await dbConnect()
  const events = await Events.find({
    tenantId,
    calendarImportChecked: true,
  })

  let synced = 0
  let failed = 0
  const failedItems = []

  for (const event of events) {
    try {
      await updateEventInCalendar(event, req, user)
      await Events.findByIdAndUpdate(event._id, {
        calendarSyncError: '',
      })
      synced += 1
    } catch (error) {
      await Events.findByIdAndUpdate(event._id, {
        calendarSyncError: 'calendar_sync_failed',
      })
      failed += 1
      failedItems.push({
        eventId: event?._id ?? null,
        title: event?.eventType || 'Мероприятие',
      })
      console.log('Google Calendar checked sync error', {
        eventId: event?._id,
        error,
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        total: events.length,
        synced,
        failed,
        failedItems,
      },
    },
    { status: 200 }
  )
}
