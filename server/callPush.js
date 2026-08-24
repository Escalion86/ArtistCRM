import SiteSettings from '@models/SiteSettings'
import {
  countActivePushSubscriptions,
  logPushDelivery,
} from '@server/pushNotifications'
import { sendMultiChannelPushToTenant } from '@server/multiChannelPush'
import { getCallRecordingNotificationState } from '@helpers/callRecordingPrompt.mjs'
import { buildIncomingMessagePushPayload } from '@helpers/incomingMessageNotification'
import { resolveClientMessageContext } from '@server/messengerPush'

const readCustomValue = (custom, key) =>
  typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

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
  return digits ? `+${digits}` : ''
}

const isCallPushEnabled = async (tenantId) => {
  if (!tenantId) return false
  const [siteSettings, activeSubscriptions] = await Promise.all([
    SiteSettings.findOne({ tenantId }).lean(),
    countActivePushSubscriptions(tenantId),
  ])
  const configured =
    readCustomValue(siteSettings?.custom, 'publicLeadPushEnabled') === true
  return configured || activeSubscriptions > 0
}

export const notifyCallRecordingReady = async ({
  tenantId,
  call,
  canAutoCreateEventFromRecording = false,
}) => {
  if (!tenantId || !call?._id || !call?.recordingUrl) return null
  const enabled = await isCallPushEnabled(tenantId)
  if (!enabled) {
    await logPushDelivery({
      tenantId,
      source: 'novofon',
      eventType: 'send',
      status: 'skipped',
      payloadType: 'novofon_recording',
      message: 'Push по записи звонка пропущен: уведомления не включены',
      meta: { callId: String(call._id) },
    })
    return null
  }

  const phone = formatPhone(call.normalizedPhone || call.phone)
  const promptState = getCallRecordingNotificationState({
    call,
    phoneLabel: phone,
    canAutoCreateEventFromRecording,
  })
  if (!promptState) return null

  const context = await resolveClientMessageContext({
    tenantId,
    clientId: call.linkedClientId,
    clientName: phone,
  })
  const basePayload = buildIncomingMessagePushPayload({
    provider: 'novofon',
    messageId: String(call._id),
    messageText: promptState.body,
    clientId: call.linkedClientId,
    clientName: context.clientName,
    event: context.event,
    notificationKind: 'recording',
  })
  const payload = {
    ...basePayload,
    tag: `novofon-recording-${call._id}`,
    actions: promptState.actions,
    categoryId: promptState.categoryId,
    data: {
      ...basePayload.data,
      url: `/cabinet/calls?callId=${call._id}`,
      callId: String(call._id),
      type: 'novofon_recording',
      promptKind: promptState.kind,
    },
  }

  return sendMultiChannelPushToTenant({
    tenantId,
    payload,
    source: 'novofon',
  })
}
