import Events from '@models/Events'
import SiteSettings from '@models/SiteSettings'
import PushReminderLogs from '@models/PushReminderLogs'
import { logPushDelivery, sendPushToTenant } from '@server/pushNotifications'

const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getZonedParts = (value, timeZone = DEFAULT_TIME_ZONE) => {
  const date = toDate(value)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  )
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  }
}

const toDateKey = (value, timeZone = DEFAULT_TIME_ZONE) => {
  const parts = getZonedParts(value, timeZone)
  if (!parts) return null
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map((value) => Number(value))
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

const canSendForTenant = (siteSettings) => {
  if (!siteSettings) return false
  const custom = siteSettings?.custom
  const readValue = (key) => {
    if (!custom) return undefined
    if (typeof custom.get === 'function') return custom.get(key)
    return custom[key]
  }
  const basePushEnabled = readValue('publicLeadPushEnabled') === true
  const remindersEnabled = readValue('additionalEventsPushEnabled')
  if (!basePushEnabled) return false
  if (remindersEnabled === false) return false
  return true
}

const buildReminderPayload = ({
  event,
  additionalEvent,
  reminderType,
  timeZone = DEFAULT_TIME_ZONE,
}) => {
  const eventId = String(event?._id || '')
  const title =
    reminderType === 'overdue'
      ? 'Просрочено доп. событие'
      : 'Напоминание по доп. событию'
  const eventTitle = String(event?.eventType || 'Событие').trim() || 'Событие'
  const additionalTitle =
    String(additionalEvent?.title || 'Доп. событие').trim() || 'Доп. событие'
  const eventDate = toDate(additionalEvent?.date)
  const timeLabel = eventDate
    ? eventDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    : '--:--'
  const dateLabel = eventDate
    ? eventDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        timeZone,
      })
    : '--.--'
  const body =
    reminderType === 'overdue'
      ? `${additionalTitle} • ${eventTitle} • просрочено`
      : `${additionalTitle} • ${eventTitle} • ${dateLabel} ${timeLabel}`

  return {
    title,
    body,
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/AppImages/android/android-launchericon-192-192.png',
    tag: `additional-${reminderType}-${eventId}-${toDateKey(additionalEvent?.date, timeZone) || Date.now()}`,
    renotify: false,
    requireInteraction: reminderType === 'overdue',
    data: {
      url: `/cabinet/eventsUpcoming?openEvent=${eventId}`,
      eventId,
      type: `additional_event_${reminderType}`,
    },
  }
}

const sendAdditionalEventsPushReminders = async ({ now = new Date() } = {}) => {
  const nowDate = toDate(now) || new Date()

  const siteSettings = await SiteSettings.find({
    'custom.publicLeadPushEnabled': true,
  })
    .select('tenantId custom timeZone')
    .lean()

  const enabledTenantSettings = siteSettings.filter((item) =>
    canSendForTenant(item)
  )
  const tenantIds = enabledTenantSettings.map((item) => String(item.tenantId))
  const settingsByTenant = new Map(
    enabledTenantSettings.map((item) => [String(item.tenantId), item])
  )

  if (tenantIds.length === 0) {
    return {
      processedEvents: 0,
      dueCandidates: 0,
      sentReminders: 0,
      skippedByDedup: 0,
      failed: 0,
      tenants: 0,
    }
  }

  const events = await Events.find({
    tenantId: { $in: tenantIds },
    status: { $nin: ['canceled', 'closed'] },
    additionalEvents: { $exists: true, $ne: [] },
  })
    .select('_id tenantId eventType additionalEvents')
    .lean()

  let dueCandidates = 0
  let sentReminders = 0
  let skippedByDedup = 0
  let failed = 0
  const tenantStats = new Map()

  const getTenantStats = (tenantId) => {
    const key = String(tenantId)
    if (!tenantStats.has(key)) {
      tenantStats.set(key, {
        processedEvents: 0,
        dueCandidates: 0,
        sentReminders: 0,
        skippedByDedup: 0,
        failed: 0,
      })
    }
    return tenantStats.get(key)
  }

  for (const event of events) {
    const tenantSettings = settingsByTenant.get(String(event.tenantId))
    const timeZone = tenantSettings?.timeZone || DEFAULT_TIME_ZONE
    const todayKey = toDateKey(nowDate, timeZone)
    const tomorrowKey = addDaysToDateKey(todayKey, 1)
    const stats = getTenantStats(event.tenantId)
    stats.processedEvents += 1

    const additionalEvents = Array.isArray(event?.additionalEvents)
      ? event.additionalEvents
      : []

    for (let index = 0; index < additionalEvents.length; index += 1) {
      const item = additionalEvents[index]
      if (!item || item.done === true) continue
      const date = toDate(item?.date)
      if (!date) continue

      let reminderType = ''
      let dateKey = ''
      const itemDateKey = toDateKey(date, timeZone)
      if (date.getTime() < nowDate.getTime()) {
        reminderType = 'overdue'
        dateKey = todayKey
      } else if (itemDateKey && itemDateKey === tomorrowKey) {
        reminderType = 'tomorrow'
        dateKey = itemDateKey
      } else {
        continue
      }

      dueCandidates += 1
      stats.dueCandidates += 1

      const dedupKey = {
        tenantId: event.tenantId,
        eventId: event._id,
        additionalEventIndex: index,
        reminderType,
        dateKey,
      }

      const exists = await PushReminderLogs.findOne(dedupKey).lean()
      if (exists) {
        skippedByDedup += 1
        stats.skippedByDedup += 1
        continue
      }

      const payload = buildReminderPayload({
        event,
        additionalEvent: item,
        reminderType,
        timeZone,
      })

      const result = await sendPushToTenant({
        tenantId: event.tenantId,
        payload,
        source: 'additional_event_reminder',
      })

      if (!result?.ok) {
        failed += 1
        stats.failed += 1
        continue
      }

      if (Number(result.sent || 0) <= 0) {
        continue
      }

      await PushReminderLogs.create({
        ...dedupKey,
        sentAt: new Date(),
      })
      sentReminders += 1
      stats.sentReminders += 1
    }
  }

  for (const [tenantId, stats] of tenantStats) {
    await logPushDelivery({
      tenantId,
      source: 'additional_event_reminder',
      eventType: 'summary',
      status: stats.failed > 0 ? 'partial' : 'ok',
      payloadType: 'additional_event_reminder',
      sent: stats.sentReminders,
      failed: stats.failed,
      message: `Итог напоминаний: кандидатов ${stats.dueCandidates}, отправлено ${stats.sentReminders}, дублей ${stats.skippedByDedup}, ошибок ${stats.failed}`,
      meta: stats,
    })
  }

  return {
    processedEvents: events.length,
    dueCandidates,
    sentReminders,
    skippedByDedup,
    failed,
    tenants: tenantIds.length,
  }
}

export { sendAdditionalEventsPushReminders }
