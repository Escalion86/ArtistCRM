import { NextResponse } from 'next/server'

import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  normalizeCalendarReminders,
  normalizeCalendarSettings,
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
  if (!access?.allowCalendarSync) {
    return NextResponse.json(
      { success: false, error: 'Синхронизация недоступна по тарифу' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const reminders = normalizeCalendarReminders(
    body?.reminders ?? {
      useDefault: body?.useDefault,
      overrides: body?.overrides,
    }
  )

  await dbConnect()
  const dbUser = await Users.findById(user._id)
  if (!dbUser) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' },
      { status: 404 }
    )
  }

  const settings = normalizeCalendarSettings(dbUser)
  dbUser.googleCalendar = {
    ...settings,
    reminders,
  }
  await dbUser.save()

  return NextResponse.json(
    { success: true, data: { reminders } },
    { status: 200 }
  )
}
