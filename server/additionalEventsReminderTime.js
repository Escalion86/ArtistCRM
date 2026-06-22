const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'
const DEFAULT_REMINDER_TIME = '10:00'
const VALID_REMINDER_MINUTES = new Set(['00', '15', '30', '45'])
const CRON_WINDOW_MINUTES = 15

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const readCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const toMinutesOfDay = (timeKey) => {
  const match = String(timeKey || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export const normalizeReminderTime = (value) => {
  const raw = String(value || '').trim()
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return DEFAULT_REMINDER_TIME
  const minutes = match[2]
  if (!VALID_REMINDER_MINUTES.has(minutes)) return DEFAULT_REMINDER_TIME
  return `${match[1]}:${minutes}`
}

export const getZonedTimeKey = (value, timeZone = DEFAULT_TIME_ZONE) => {
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

export const shouldRunForTenantReminderTime = (siteSettings, nowDate) => {
  const timeZone = siteSettings?.timeZone || DEFAULT_TIME_ZONE
  const currentMinutes = toMinutesOfDay(getZonedTimeKey(nowDate, timeZone))
  if (currentMinutes === null) return false

  const reminderTime = normalizeReminderTime(
    readCustomValue(siteSettings?.custom, 'additionalEventsPushTime')
  )
  const reminderMinutes = toMinutesOfDay(reminderTime)
  if (reminderMinutes === null) return false

  const diff = currentMinutes - reminderMinutes
  return diff >= 0 && diff < CRON_WINDOW_MINUTES
}
