import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import {
  normalizeCalendarReminders,
  normalizeCalendarSettings,
  normalizeCalendarStatusColors,
  normalizeCalendarSyncSettings,
} from '@server/googleUserCalendarClient'
import {
  clearGoogleCalendarCredentials,
  serializeMobileGoogleCalendar,
} from '@server/mobile/googleCalendar'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

const getContext = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) return { error: 'unauthorized' }
  const access = await getUserTariffAccess(context.user._id)
  return { context, access }
}

export const GET = async (req) => {
  const { context, access, error } = await getContext(req)
  if (error) return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  await dbConnect()
  const user = await Users.findOne({
    _id: context.user._id,
    tenantId: context.tenantId,
  }).select('googleCalendar').lean()
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  return mobileSuccess(serializeMobileGoogleCalendar(
    normalizeCalendarSettings(user),
    access
  ))
}

export const PATCH = async (req) => {
  const { context, access, error } = await getContext(req)
  if (error) return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  if (!access?.allowCalendarSync) {
    return mobileError('CALENDAR_TARIFF_REQUIRED', 'Синхронизация недоступна по тарифу', 403)
  }
  const body = await req.json().catch(() => ({}))
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
  user.googleCalendar = {
    ...settings,
    enabled: body?.enabled === undefined ? settings.enabled : Boolean(body.enabled),
    reminders: body?.reminders === undefined
      ? settings.reminders
      : normalizeCalendarReminders(body.reminders),
    statusColors: body?.statusColors === undefined
      ? settings.statusColors
      : normalizeCalendarStatusColors(body.statusColors),
    syncSettings: body?.syncSettings === undefined
      ? settings.syncSettings
      : normalizeCalendarSyncSettings(body.syncSettings),
    deleteCanceledFromCalendar: body?.deleteCanceledFromCalendar === undefined
      ? settings.deleteCanceledFromCalendar
      : Boolean(body.deleteCanceledFromCalendar),
    skipTransferredFromCalendar: body?.skipTransferredFromCalendar === undefined
      ? settings.skipTransferredFromCalendar
      : Boolean(body.skipTransferredFromCalendar),
  }
  await user.save()
  return mobileSuccess(serializeMobileGoogleCalendar(
    normalizeCalendarSettings(user),
    access
  ))
}

export const DELETE = async (req) => {
  const { context, access, error } = await getContext(req)
  if (error) return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  await dbConnect()
  const user = await Users.findOne({
    _id: context.user._id,
    tenantId: context.tenantId,
  })
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  clearGoogleCalendarCredentials(user)
  await user.save()
  return mobileSuccess(serializeMobileGoogleCalendar(
    normalizeCalendarSettings(user),
    access
  ))
}
