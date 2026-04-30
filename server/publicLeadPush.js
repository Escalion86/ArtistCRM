import { sendPushToTenant } from '@server/pushNotifications'

const formatPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 11 && digits[0] === '7') {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  if (digits.length === 11 && digits[0] === '8') {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
  }
  return `+${digits}`
}

const buildApiLeadPushPayload = ({ event, normalizedData }) => {
  const source = String(normalizedData?.source || 'public_api')
  const formattedPhone = formatPhone(normalizedData?.phone)
  const bodyParts = []
  if (formattedPhone) bodyParts.push(`Телефон: ${formattedPhone}`)
  if (source) bodyParts.push(`Источник: ${source}`)

  return {
    title: 'Новая заявка',
    body: bodyParts.join(' | ') || 'Откройте кабинет для просмотра',
    icon: '/icons/AppImages/android/android-launchericon-192-192.png',
    badge: '/icons/AppImages/android/android-launchericon-192-192.png',
    tag: `api-lead-${event?._id || Date.now()}`,
    data: {
      url: `/cabinet/eventsUpcoming?openEvent=${event?._id}`,
      eventId: String(event?._id || ''),
      type: 'api_lead',
    },
  }
}

const notifyApiLeadCreated = async ({ tenantId, event, normalizedData }) => {
  if (!tenantId || !event?._id) return null
  const payload = buildApiLeadPushPayload({ event, normalizedData })
  return sendPushToTenant({ tenantId, payload, source: 'public_lead' })
}

export { notifyApiLeadCreated }
