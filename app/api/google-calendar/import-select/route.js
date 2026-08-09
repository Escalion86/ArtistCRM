import { NextResponse } from 'next/server'

import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  listUserImportCalendars,
  normalizeImportCalendarSettings,
} from '@server/googleUserCalendarClient'

export const runtime = 'nodejs'

export const POST = async (req) => {
  const { user } = await getTenantContext()
  if (!user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  const access = await getUserTariffAccess(user._id)
  if (!access?.allowCalendarSync || !access?.allowAi) {
    return NextResponse.json(
      {
        success: false,
        error: 'Импорт доступен только в тарифе с календарём и ИИ',
      },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const calendarId = String(body?.calendarId ?? '').trim()
  if (!calendarId) {
    return NextResponse.json(
      { success: false, error: 'Не указан календарь для импорта' },
      { status: 400 }
    )
  }

  await dbConnect()
  const dbUser = await Users.findById(user._id)
  if (!dbUser) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  const settings = normalizeImportCalendarSettings(dbUser)
  if (!settings.refreshToken) {
    return NextResponse.json(
      { success: false, error: 'Google Calendar не подключен' },
      { status: 400 }
    )
  }

  const calendars = await listUserImportCalendars(dbUser)
  const selectedCalendar = calendars.find((item) => item.id === calendarId)
  if (!selectedCalendar) {
    return NextResponse.json(
      { success: false, error: 'Календарь не найден' },
      { status: 404 }
    )
  }

  dbUser.googleCalendarImport = {
    ...settings,
    enabled: true,
    calendarId,
    calendarName: selectedCalendar.summary || '',
  }
  await dbUser.save()

  return NextResponse.json(
    {
      success: true,
      data: {
        calendarId,
        calendarName: selectedCalendar.summary || '',
      },
    },
    { status: 200 }
  )
}
