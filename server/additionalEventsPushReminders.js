import Events from '@models/Events'
import SiteSettings from '@models/SiteSettings'
import PushReminderLogs from '@models/PushReminderLogs'
import { sendPushToTenant } from '@server/pushNotifications'

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDateKey = (value) => {
  const date = toDate(value)
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const buildDateBounds = (now = new Date()) => {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfterTomorrow = new Date(startOfTomorrow)
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1)
  return {
    now,
    startOfToday,
    startOfTomorrow,
    startOfDayAfterTomorrow,
  }
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

const buildReminderPayload = ({ event, additionalEvent, reminderType }) => {
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
      })
    : '--:--'
  const dateLabel = eventDate
    ? eventDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
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
    tag: `additional-${reminderType}-${eventId}-${toDateKey(additionalEvent?.date) || Date.now()}`,
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
  const {
    startOfTomorrow,
    startOfDayAfterTomorrow,
    now: nowDate,
  } = buildDateBounds(now)

  const siteSettings = await SiteSettings.find({
    'custom.publicLeadPushEnabled': true,
  })
    .select('tenantId custom')
    .lean()

  const tenantIds = siteSettings
    .filter((item) => canSendForTenant(item))
    .map((item) => String(item.tenantId))

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

  for (const event of events) {
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
      if (date.getTime() < nowDate.getTime()) {
        reminderType = 'overdue'
        dateKey = toDateKey(nowDate)
      } else if (
        date.getTime() >= startOfTomorrow.getTime() &&
        date.getTime() < startOfDayAfterTomorrow.getTime()
      ) {
        reminderType = 'tomorrow'
        dateKey = toDateKey(date)
      } else {
        continue
      }

      dueCandidates += 1

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
        continue
      }

      const payload = buildReminderPayload({
        event,
        additionalEvent: item,
        reminderType,
      })

      const result = await sendPushToTenant({
        tenantId: event.tenantId,
        payload,
      })

      if (!result?.ok) {
        failed += 1
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
    }
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
