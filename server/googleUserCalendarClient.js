import { google } from 'googleapis'

const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar'

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

const normalizeCalendarSettings = (user) => {
  const settings = user?.googleCalendar ?? {}
  return {
    enabled: Boolean(settings.enabled),
    calendarId: settings.calendarId || '',
    refreshToken: settings.refreshToken || '',
    accessToken: settings.accessToken || '',
    tokenExpiry: settings.tokenExpiry || null,
    scope: settings.scope || '',
    syncToken: settings.syncToken || '',
    connectedAt: settings.connectedAt || null,
    email: settings.email || '',
  }
}

const getUserOAuthClient = (user) => {
  const oauth = getOAuthClient()
  if (!oauth || !user) return null
  const settings = normalizeCalendarSettings(user)
  if (!settings.refreshToken) return null
  oauth.setCredentials({
    refresh_token: settings.refreshToken,
    access_token: settings.accessToken || undefined,
    expiry_date: settings.tokenExpiry
      ? new Date(settings.tokenExpiry).getTime()
      : undefined,
    scope: settings.scope || undefined,
  })
  return oauth
}

const getUserCalendarClient = (user) => {
  const auth = getUserOAuthClient(user)
  if (!auth) return null
  return google.calendar({ version: 'v3', auth })
}

const listUserCalendars = async (user) => {
  const calendar = getUserCalendarClient(user)
  if (!calendar) return []
  const response = await calendar.calendarList.list()
  const items = Array.isArray(response?.data?.items) ? response.data.items : []
  return items.map((item) => ({
    id: item.id,
    summary: item.summary,
    primary: Boolean(item.primary),
    accessRole: item.accessRole,
  }))
}

const getUserCalendarId = (user) => {
  const settings = normalizeCalendarSettings(user)
  return settings.calendarId || 'primary'
}

export {
  READ_SCOPE,
  WRITE_SCOPE,
  getOAuthClient,
  getUserOAuthClient,
  getUserCalendarClient,
  listUserCalendars,
  normalizeCalendarSettings,
  getUserCalendarId,
}
