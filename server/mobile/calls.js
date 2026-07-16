const CALL_RESULTS = new Set(['answered', 'no_answer', 'callback', 'follow_up'])

const asId = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value
  return typeof value.toString === 'function' ? value.toString() : null
}

const asDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const asText = (value, maxLength = 10000) =>
  String(value || '').trim().slice(0, maxLength)

export const normalizeMobileCallResult = (value) => {
  const result = String(value || '').trim()
  return CALL_RESULTS.has(result) ? result : null
}

export const serializeMobileCall = (call = {}) => {
  const fields = call.aiExtractedFields || {}
  return {
    _id: asId(call._id),
    provider: asText(call.provider, 40),
    direction: ['incoming', 'outgoing', 'unknown'].includes(call.direction)
      ? call.direction
      : 'unknown',
    phone: asText(call.phone || call.normalizedPhone, 32),
    startedAt: asDate(call.startedAt),
    endedAt: asDate(call.endedAt),
    durationSec: Math.max(0, Number(call.durationSec || 0)),
    status: ['new', 'processing', 'ready', 'linked', 'ignored', 'failed'].includes(call.status)
      ? call.status
      : 'new',
    recordingUrl: asText(call.recordingUrl, 4000),
    recordingExpiresAt: asDate(call.recordingExpiresAt),
    transcript: asText(call.transcript, 100000),
    aiSummary: asText(call.aiSummary, 20000),
    aiExtractedFields: {
      clientName: asText(fields.clientName, 200),
      eventType: asText(fields.eventType, 200),
      eventDate: asDate(fields.eventDate),
      eventCity: asText(fields.eventCity, 200),
      eventLocation: asText(fields.eventLocation, 500),
      guestCount: asText(fields.guestCount, 100),
      budget: Number.isFinite(Number(fields.budget)) ? Number(fields.budget) : null,
      nextContactAt: asDate(fields.nextContactAt),
      nextContactReason: asText(fields.nextContactReason, 500),
      objections: Array.isArray(fields.objections)
        ? fields.objections.map((item) => asText(item, 300)).filter(Boolean).slice(0, 20)
        : [],
      confidence: Number.isFinite(Number(fields.confidence))
        ? Number(fields.confidence)
        : 0,
    },
    linkedClientId: asId(call.linkedClientId),
    linkedEventId: asId(call.linkedEventId),
    eventDecision: asText(call.eventDecision, 40),
    callResult: normalizeMobileCallResult(call.callResult) || '',
    callResultNote: asText(call.callResultNote, 1000),
    callResultAt: asDate(call.callResultAt),
    processingError: asText(call.processingError, 1000),
    createdAt: asDate(call.createdAt),
    updatedAt: asDate(call.updatedAt),
  }
}

export const sanitizeMobileCallPayload = (payload = {}) => {
  if (!payload?.data) return payload
  if (Array.isArray(payload.data)) {
    return { ...payload, data: payload.data.map(serializeMobileCall) }
  }
  if (payload.data.call) {
    return {
      ...payload,
      data: {
        call: serializeMobileCall(payload.data.call),
        event: payload.data.event
          ? {
              _id: asId(payload.data.event._id),
              clientId: asId(payload.data.event.clientId),
              status: asText(payload.data.event.status, 40),
            }
          : null,
      },
    }
  }
  return { ...payload, data: serializeMobileCall(payload.data) }
}
