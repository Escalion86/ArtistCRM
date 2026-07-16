const DEFAULT_REMINDER_TIME = '10:00'
const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):(00|15|30|45)$/

const readCustom = (custom, key) =>
  typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

export const normalizeMobileReminderTime = (value) => {
  const time = String(value || '').trim()
  return REMINDER_TIME_PATTERN.test(time) ? time : null
}

export const serializeMobileNotificationSettings = ({
  siteSettings,
  deviceSubscribed = false,
  activeDeviceCount = 0,
} = {}) => {
  const custom = siteSettings?.custom
  return {
    remindersEnabled: readCustom(custom, 'additionalEventsPushEnabled') !== false,
    reminderTime:
      normalizeMobileReminderTime(readCustom(custom, 'additionalEventsPushTime'))
      || DEFAULT_REMINDER_TIME,
    pushConfigured: readCustom(custom, 'publicLeadPushEnabled') === true,
    deviceSubscribed: Boolean(deviceSubscribed),
    activeDeviceCount: Math.max(0, Number(activeDeviceCount || 0)),
    timeZone: String(siteSettings?.timeZone || 'Asia/Krasnoyarsk'),
  }
}
