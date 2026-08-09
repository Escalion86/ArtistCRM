export const TARIFF_FEATURES = Object.freeze([
  { key: 'allowCalendarSync', label: 'Синхронизация с Google Calendar' },
  { key: 'allowStatistics', label: 'Расширенная статистика' },
  { key: 'allowDocuments', label: 'Документы и шаблоны' },
  { key: 'allowTelephony', label: 'Телефония' },
  { key: 'allowAi', label: 'ИИ-функции' },
  { key: 'allowAvitoIntegration', label: 'Интеграция с Avito' },
  { key: 'allowVkIntegration', label: 'Интеграция с VK' },
  { key: 'allowTelegramIntegration', label: 'Интеграция с Telegram' },
  { key: 'allowPublicLeadApi', label: 'API входящих заявок' },
])

export const getTariffFeatureKeys = (tariff) =>
  TARIFF_FEATURES.filter(({ key }) => Boolean(tariff?.[key])).map(
    ({ key }) => key
  )

export const getTariffFeatureLabels = (tariff) => {
  const labels = TARIFF_FEATURES.filter(({ key }) => Boolean(tariff?.[key])).map(
    ({ label }) => label
  )
  const eventsPerMonth = Number(tariff?.eventsPerMonth ?? 0)
  if (eventsPerMonth > 0) {
    labels.unshift(`До ${eventsPerMonth} мероприятий в месяц`)
  }
  return labels
}
