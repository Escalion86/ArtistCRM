export const serializeMobileGoogleCalendar = (settings = {}, access = {}) => {
  return {
    available: Boolean(access?.allowCalendarSync),
    connected: Boolean(settings.refreshToken),
    enabled: settings.enabled,
    calendarId: settings.calendarId,
    calendarName: settings.calendarName,
    connectedAt: settings.connectedAt,
    reminders: settings.reminders,
    statusColors: settings.statusColors,
    syncSettings: settings.syncSettings,
    deleteCanceledFromCalendar: settings.deleteCanceledFromCalendar,
    skipTransferredFromCalendar: settings.skipTransferredFromCalendar,
  }
}

export const clearGoogleCalendarCredentials = (user) => {
  const settings = user?.googleCalendar || {}
  user.googleCalendar = {
    ...settings,
    enabled: false,
    calendarId: '',
    calendarName: '',
    refreshToken: '',
    accessToken: '',
    tokenExpiry: null,
    scope: '',
    syncToken: '',
    connectedAt: null,
    email: '',
  }
  return user
}
