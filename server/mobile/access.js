const ACCESS_FLAGS = [
  'trialActive',
  'hasTariff',
  'allowCalendarSync',
  'allowStatistics',
  'allowDocuments',
  'allowTelephony',
  'allowAi',
  'allowAvitoIntegration',
  'allowVkIntegration',
  'allowPublicLeadApi',
]

export const sanitizeMobileAccess = (access = {}) => ({
  ...Object.fromEntries(
    ACCESS_FLAGS.map((key) => [key, access?.[key] === true])
  ),
  eventsPerMonth: Number.isFinite(Number(access?.eventsPerMonth))
    ? Math.max(0, Number(access.eventsPerMonth))
    : null,
})
