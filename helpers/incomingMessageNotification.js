const PROVIDER_LABELS = {
  avito: 'Avito',
  novofon: 'Телефония',
  telegram: 'Telegram',
  vk: 'VK',
}

const normalizeText = (value, fallback = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim() || fallback

const truncateText = (value, maxLength = 120) => {
  const text = normalizeText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

const formatEventDate = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const buildIncomingMessagePushPayload = ({
  provider,
  messageId,
  messageText,
  clientId,
  clientName,
  event,
  notificationKind = 'message',
}) => {
  const providerLabel = PROVIDER_LABELS[provider] || normalizeText(provider, 'CRM')
  const safeClientName = normalizeText(clientName, 'Клиент')
  const eventId = String(event?._id || '')
  const eventTitle = normalizeText(event?.eventType, 'Мероприятие')
  const eventDate = formatEventDate(event?.eventDate)
  const bodyParts = [safeClientName]

  if (messageText) bodyParts.push(truncateText(messageText))
  if (eventId) {
    bodyParts.push(
      `Ближайшее: ${eventTitle}${eventDate ? `, ${eventDate}` : ''}`
    )
  }

  const isRecording = notificationKind === 'recording'
  return {
    title: isRecording
      ? `Получена запись звонка · ${safeClientName}`
      : `Новое сообщение · ${providerLabel}`,
    body: bodyParts.join(' • '),
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/notification-badge.svg',
    tag: `${isRecording ? 'call-recording' : 'incoming-message'}-${provider}-${
      messageId || Date.now()
    }`,
    requireInteraction: true,
    data: {
      url: eventId
        ? `/cabinet/eventsUpcoming?openEvent=${eventId}`
        : '/cabinet/clients',
      clientId: String(clientId || ''),
      eventId,
      provider,
      type: isRecording ? 'telephony_recording' : 'incoming_messenger_message',
    },
  }
}

export { formatEventDate, PROVIDER_LABELS }
