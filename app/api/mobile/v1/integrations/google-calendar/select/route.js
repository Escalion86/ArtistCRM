import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  listUserCalendars,
  normalizeCalendarSettings,
} from '@server/googleUserCalendarClient'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const access = await getUserTariffAccess(context.user._id)
  if (!access?.allowCalendarSync) {
    return mobileError('CALENDAR_TARIFF_REQUIRED', 'Синхронизация недоступна по тарифу', 403)
  }
  const body = await req.json().catch(() => ({}))
  const calendarId = String(body?.calendarId || '').trim()
  if (!calendarId) return mobileError('CALENDAR_ID_REQUIRED', 'Не указан календарь', 400)
  await dbConnect()
  const user = await Users.findOne({
    _id: context.user._id,
    tenantId: context.tenantId,
  })
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  const settings = normalizeCalendarSettings(user)
  if (!settings.refreshToken) {
    return mobileError('CALENDAR_NOT_CONNECTED', 'Google Calendar не подключен', 400)
  }
  try {
    const calendars = await listUserCalendars(user)
    const selected = calendars.find((item) => item.id === calendarId)
    if (!selected) return mobileError('CALENDAR_NOT_FOUND', 'Календарь не найден', 404)
    user.googleCalendar = {
      ...settings,
      enabled: true,
      calendarId,
      calendarName: selected.summary || '',
      syncToken: '',
    }
    await user.save()
    return mobileSuccess({
      calendarId,
      calendarName: selected.summary || '',
    })
  } catch (error) {
    console.error('[mobile/google-calendar/select]', error?.message || error)
    return mobileError('CALENDAR_PROVIDER_ERROR', 'Не удалось выбрать календарь Google', 502)
  }
}
