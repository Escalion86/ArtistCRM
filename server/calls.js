import mongoose from 'mongoose'
import Clients from '@models/Clients'
import Events from '@models/Events'

const DEFAULT_CALL_ADDRESS = Object.freeze({
  town: '',
  street: '',
  house: '',
  entrance: '',
  floor: '',
  flat: '',
  comment: '',
  latitude: '',
  longitude: '',
  link2Gis: '',
  linkYandexNavigator: '',
  link2GisShow: true,
  linkYandexShow: true,
})

export const normalizePhoneDigits = (phone) =>
  String(phone ?? '').replace(/[^\d]/g, '')

export const normalizeRuPhone = (phone) => {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return ''
  if (digits.length === 10) return `7${digits}`
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

export const normalizeCallDirection = (direction) => {
  if (direction === 'incoming' || direction === 'outgoing') return direction
  return 'unknown'
}

export const normalizeCallStatus = (status) => {
  const allowed = new Set([
    'new',
    'processing',
    'ready',
    'linked',
    'ignored',
    'failed',
  ])
  return allowed.has(status) ? status : 'new'
}

export const parseOptionalDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const parseOptionalNumber = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number
}

const normalizeObjectId = (value) => {
  if (!value) return null
  const stringValue = String(value)
  return mongoose.Types.ObjectId.isValid(stringValue) ? stringValue : null
}

export const findClientByCallPhone = async (tenantId, normalizedPhone) => {
  if (!tenantId || !normalizedPhone) return null
  const phoneAsNumber = Number(normalizedPhone)
  const phoneQuery = Number.isNaN(phoneAsNumber)
    ? { phone: normalizedPhone }
    : {
        $or: [
          { phone: normalizedPhone },
          { phone: phoneAsNumber },
          { whatsapp: normalizedPhone },
          { whatsapp: phoneAsNumber },
        ],
      }
  return Clients.findOne({ tenantId, ...phoneQuery }).lean()
}

export const normalizeCallInput = async (body, tenantId) => {
  const normalizedPhone = normalizeRuPhone(body?.phone)
  const linkedClientId = normalizeObjectId(body?.linkedClientId)
  const linkedEventId = normalizeObjectId(body?.linkedEventId)
  const matchedClient =
    linkedClientId || !normalizedPhone
      ? null
      : await findClientByCallPhone(tenantId, normalizedPhone)

  return {
    provider: String(body?.provider || 'manual').trim() || 'manual',
    providerCallId: String(body?.providerCallId || '').trim(),
    direction: normalizeCallDirection(body?.direction),
    phone: String(body?.phone || '').trim(),
    normalizedPhone,
    startedAt: parseOptionalDate(body?.startedAt) ?? new Date(),
    endedAt: parseOptionalDate(body?.endedAt),
    durationSec: Math.max(0, parseOptionalNumber(body?.durationSec, 0)),
    status: normalizeCallStatus(body?.status),
    recordingUrl: String(body?.recordingUrl || '').trim(),
    recordingStorageKey: String(body?.recordingStorageKey || '').trim(),
    recordingExpiresAt: parseOptionalDate(body?.recordingExpiresAt),
    transcript: String(body?.transcript || '').trim(),
    linkedClientId: linkedClientId ?? matchedClient?._id ?? null,
    linkedEventId,
  }
}

export const buildEventDraftFromCall = async (call, tenantId) => {
  const fields = call?.aiExtractedFields ?? {}
  const linkedClientId = normalizeObjectId(call?.linkedClientId)
  const linkedEventId = normalizeObjectId(call?.linkedEventId)
  const linkedEvent = linkedEventId
    ? await Events.findOne({ _id: linkedEventId, tenantId }).lean()
    : null

  const additionalEvents = []
  if (fields?.nextContactAt) {
    additionalEvents.push({
      title: 'Следующий контакт',
      description:
        fields.nextContactReason ||
        'Напоминание предложено по итогам телефонного разговора',
      date: fields.nextContactAt,
      done: false,
      googleCalendarEventId: '',
    })
  }

  const summaryParts = [
    call?.aiSummary ? `AI-резюме звонка:\n${call.aiSummary}` : '',
    call?.transcript ? `\nTranscript:\n${call.transcript}` : '',
  ].filter(Boolean)

  return {
    clientId: linkedClientId,
    status: 'draft',
    requestCreatedAt: call?.startedAt ?? new Date(),
    eventDate: fields?.eventDate ?? null,
    dateEnd: null,
    address: {
      ...DEFAULT_CALL_ADDRESS,
      town: fields?.eventCity ?? '',
      comment: fields?.eventLocation ?? '',
    },
    contractSum: fields?.budget ?? 0,
    eventType: fields?.eventType ?? linkedEvent?.eventType ?? 'other',
    description: summaryParts.join('\n').trim(),
    financeComment: fields?.budget
      ? `Бюджет из разговора: ${fields.budget}`
      : '',
    additionalEvents,
    sourceCallId: call?._id ?? null,
  }
}
