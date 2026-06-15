import Events from '@models/Events'
import SiteSettings from '@models/SiteSettings'
import PushReminderLogs from '@models/PushReminderLogs'
import { logPushDelivery, sendPushToTenant } from '@server/pushNotifications'

const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'
const DEFAULT_REMINDER_TIME = '10:00'
const VALID_REMINDER_MINUTES = new Set(['00', '15', '30', '45'])

const MAX_SUMMARY_ITEMS = 15
const SUMMARY_TAG = 'daily_push_reminder_summary'

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
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
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

const normalizeReminderTime = (value) => {
  const raw = String(value || '').trim()
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return DEFAULT_REMINDER_TIME
  const minutes = match[2]
  if (!VALID_REMINDER_MINUTES.has(minutes)) return DEFAULT_REMINDER_TIME
  return `${match[1]}:${minutes}`
}

const getZonedTimeKey = (value, timeZone = DEFAULT_TIME_ZONE) => {
  const date = toDate(value)
  if (!date) return null
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (!map.hour || !map.minute) return null
  return `${map.hour}:${map.minute}`
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

const shouldRunForTenantTime = (siteSettings, nowDate) => {
  const timeZone = siteSettings?.timeZone || DEFAULT_TIME_ZONE
  const currentTime = getZonedTimeKey(nowDate, timeZone)
  const custom = siteSettings?.custom
  const reminderTime =
    typeof custom?.get === 'function'
      ? custom.get('additionalEventsPushTime')
      : custom?.additionalEventsPushTime
  return currentTime === normalizeReminderTime(reminderTime)
}

const formatItemLine = ({ title, date, isOverdue, timeZone }) => {
  const dateObj = toDate(date)
  const timeStr = dateObj
    ? dateObj.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
      })
    : '--:--'
  const dateStr = dateObj
    ? dateObj.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        timeZone,
      })
    : '--.--'
  if (isOverdue) {
    return `⚠️ ${title} — просрочено (${dateStr})`
  }
  return `• ${title} — ${dateStr} ${timeStr}`
}

const buildSummaryPayload = ({
  tenantSettings,
  timeZone = DEFAULT_TIME_ZONE,
  overdueMainEvents = [],
  tomorrowMainEvents = [],
  overdueAdditionalEvents = [],
  tomorrowAdditionalEvents = [],
}) => {
  const lines = []
  const allItems = []

  for (const item of overdueMainEvents) {
    allItems.push({
      type: 'overdue_main',
      eventId: item.eventId,
      label: formatItemLine({
        title: item.title,
        date: item.date,
        isOverdue: true,
        timeZone,
      }),
    })
  }

  for (const item of tomorrowMainEvents) {
    allItems.push({
      type: 'tomorrow_main',
      eventId: item.eventId,
      label: formatItemLine({
        title: item.title,
        date: item.date,
        isOverdue: false,
        timeZone,
      }),
    })
  }

  for (const item of overdueAdditionalEvents) {
    allItems.push({
      type: 'overdue_additional',
      eventId: item.eventId,
      label: formatItemLine({
        title: `${item.additionalTitle} • ${item.eventTitle}`,
        date: item.date,
        isOverdue: true,
        timeZone,
      }),
    })
  }

  for (const item of tomorrowAdditionalEvents) {
    allItems.push({
      type: 'tomorrow_additional',
      eventId: item.eventId,
      label: formatItemLine({
        title: `${item.additionalTitle} • ${item.eventTitle}`,
        date: item.date,
        isOverdue: false,
        timeZone,
      }),
    })
  }

  const totalCount = allItems.length
  const hasOverdue =
    overdueMainEvents.length > 0 || overdueAdditionalEvents.length > 0

  // Build display lines (capped for notification body)
  const displayItems = allItems.slice(0, MAX_SUMMARY_ITEMS)
  for (const item of displayItems) {
    lines.push(item.label)
  }

  if (totalCount > MAX_SUMMARY_ITEMS) {
    lines.push(`...и ещё ${totalCount - MAX_SUMMARY_ITEMS}`)
  }

  const title = hasOverdue
    ? `📋 Сводка: ${totalCount} напоминаний`
    : `📋 Напоминания: ${totalCount} мероприятий`

  const body = lines.join('\n')

  // Determine primary event ID for deep link (first overdue or first tomorrow)
  const firstOverdue = allItems.find(
    (i) => i.type === 'overdue_main' || i.type === 'overdue_additional'
  )
  const firstItem = firstOverdue || allItems[0]
  const primaryEventId = firstItem?.eventId || ''

  return {
    title,
    body,
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/notification-badge.svg',
    tag: SUMMARY_TAG,
    renotify: false,
    requireInteraction: hasOverdue,
    data: {
      url: primaryEventId
        ? `/cabinet/eventsUpcoming?openEvent=${primaryEventId}`
        : '/cabinet/eventsUpcoming',
      type: 'push_reminder_summary',
      totalCount,
      overdueCount: overdueMainEvents.length + overdueAdditionalEvents.length,
      tomorrowCount:
        tomorrowMainEvents.length + tomorrowAdditionalEvents.length,
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

  const enabledTenantSettings = (siteSettings || []).filter((item) =>
    canSendForTenant(item)
  )
  const scheduledTenantSettings = enabledTenantSettings.filter((item) =>
    shouldRunForTenantTime(item, nowDate)
  )
  const skippedByTime =
    enabledTenantSettings.length - scheduledTenantSettings.length
  const settingsByTenant = new Map(
    scheduledTenantSettings.map((item) => [String(item.tenantId), item])
  )

  if (scheduledTenantSettings.length === 0) {
    return {
      processedEvents: 0,
      dueCandidates: 0,
      sentReminders: 0,
      skippedByDedup: 0,
      skippedByTime,
      failed: 0,
      tenants: enabledTenantSettings.length,
      scheduledTenants: 0,
    }
  }

  const tenantIds = scheduledTenantSettings.map((item) => String(item.tenantId))

  const events = await Events.find({
    tenantId: { $in: tenantIds },
    status: { $nin: ['canceled', 'closed'] },
    $or: [
      { eventDate: { $ne: null } },
      { additionalEvents: { $exists: true, $ne: [] } },
    ],
  })
    .select('_id tenantId eventType eventDate additionalEvents')
    .lean()

  let dueCandidates = 0
  let sentReminders = 0
  let skippedByDedup = 0
  let failed = 0
  const tenantStats = new Map()

  // Collect due items per tenant for summary push
  const tenantDueItems = new Map()

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

  const getTenantDueItems = (tenantId) => {
    const key = String(tenantId)
    if (!tenantDueItems.has(key)) {
      tenantDueItems.set(key, {
        overdueMainEvents: [],
        tomorrowMainEvents: [],
        overdueAdditionalEvents: [],
        tomorrowAdditionalEvents: [],
      })
    }
    return tenantDueItems.get(key)
  }

  for (const event of events) {
    const tenantSettings = settingsByTenant.get(String(event.tenantId))
    if (!tenantSettings) continue
    const timeZone = tenantSettings?.timeZone || DEFAULT_TIME_ZONE
    const todayKey = toDateKey(nowDate, timeZone)
    const tomorrowKey = addDaysToDateKey(todayKey, 1)
    const stats = getTenantStats(event.tenantId)
    const dueItems = getTenantDueItems(event.tenantId)
    stats.processedEvents += 1

    // --- Main event date reminder ---
    if (event.eventDate) {
      const mainDate = toDate(event.eventDate)
      if (mainDate) {
        let reminderType = ''
        let dateKey = ''
        const mainDateKey = toDateKey(mainDate, timeZone)
        if (mainDate.getTime() < nowDate.getTime()) {
          reminderType = 'overdue'
          dateKey = todayKey
        } else if (mainDateKey && mainDateKey === tomorrowKey) {
          reminderType = 'tomorrow'
          dateKey = mainDateKey
        }

        if (reminderType) {
          dueCandidates += 1
          stats.dueCandidates += 1

          const dedupKey = {
            tenantId: event.tenantId,
            eventId: event._id,
            additionalEventIndex: null,
            reminderType,
            dateKey,
          }

          const exists = await PushReminderLogs.findOne(dedupKey).lean()
          if (exists) {
            skippedByDedup += 1
            stats.skippedByDedup += 1
          } else {
            // Collect into summary items instead of sending individual push
            const eventTitle =
              String(event?.eventType || 'Мероприятие').trim() || 'Мероприятие'
            if (reminderType === 'overdue') {
              dueItems.overdueMainEvents.push({
                eventId: String(event._id),
                title: eventTitle,
                date: mainDate,
              })
            } else {
              dueItems.tomorrowMainEvents.push({
                eventId: String(event._id),
                title: eventTitle,
                date: mainDate,
              })
            }

            // Mark as processed in log (dedup for future runs)
            await PushReminderLogs.create({
              ...dedupKey,
              sentAt: new Date(),
            })
            sentReminders += 1
            stats.sentReminders += 1
          }
        }
      }
    }

    // --- Additional events reminders ---
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

      // Collect into summary items instead of sending individual push
      const eventTitle =
        String(event?.eventType || 'Событие').trim() || 'Событие'
      const additionalTitle =
        String(item?.title || 'Доп. событие').trim() || 'Доп. событие'

      if (reminderType === 'overdue') {
        dueItems.overdueAdditionalEvents.push({
          eventId: String(event._id),
          eventTitle,
          additionalTitle,
          date,
        })
      } else {
        dueItems.tomorrowAdditionalEvents.push({
          eventId: String(event._id),
          eventTitle,
          additionalTitle,
          date,
        })
      }

      // Mark as processed in log
      await PushReminderLogs.create({
        ...dedupKey,
        sentAt: new Date(),
      })
      sentReminders += 1
      stats.sentReminders += 1
    }
  }

  // Send one summary push per tenant
  for (const [tenantId, dueItems] of tenantDueItems) {
    const tenantSettings = settingsByTenant.get(tenantId)
    const timeZone = tenantSettings?.timeZone || DEFAULT_TIME_ZONE
    const hasItems =
      dueItems.overdueMainEvents.length > 0 ||
      dueItems.tomorrowMainEvents.length > 0 ||
      dueItems.overdueAdditionalEvents.length > 0 ||
      dueItems.tomorrowAdditionalEvents.length > 0

    if (!hasItems) continue

    const payload = buildSummaryPayload({
      tenantSettings,
      timeZone,
      ...dueItems,
    })

    const result = await sendPushToTenant({
      tenantId,
      payload,
      source: 'push_reminder_summary',
    })

    if (!result?.ok) {
      failed += 1
      const stats = getTenantStats(tenantId)
      stats.failed += 1
    }
  }

  for (const [tenantId, stats] of tenantStats) {
    await logPushDelivery({
      tenantId,
      source: 'push_reminder_summary',
      eventType: 'summary',
      status: stats.failed > 0 ? 'partial' : 'ok',
      payloadType: 'push_reminder',
      sent: stats.sentReminders,
      failed: stats.failed,
      message: `Итого напоминаний: кандидатов ${stats.dueCandidates}, собрано в сводку ${stats.sentReminders}, дублей ${stats.skippedByDedup}, ошибок ${stats.failed}`,
      meta: stats,
    })
  }

  return {
    processedEvents: events.length,
    dueCandidates,
    sentReminders,
    skippedByDedup,
    skippedByTime,
    failed,
    tenants: enabledTenantSettings.length,
    scheduledTenants: scheduledTenantSettings.length,
  }
}

export { sendAdditionalEventsPushReminders }
