import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  listUserCalendars,
  normalizeCalendarSettings,
} from '@server/googleUserCalendarClient'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const access = await getUserTariffAccess(context.user._id)
  if (!access?.allowCalendarSync) {
    return mobileError('CALENDAR_TARIFF_REQUIRED', 'Синхронизация недоступна по тарифу', 403)
  }
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
    return mobileSuccess({
      calendars,
      selectedId: settings.calendarId || 'primary',
    })
  } catch (error) {
    console.error('[mobile/google-calendar/calendars]', error?.message || error)
    return mobileError('CALENDAR_PROVIDER_ERROR', 'Не удалось получить календари Google', 502)
  }
}
