import mongoose from 'mongoose'
import SiteSettings from '@models/SiteSettings'
import { normalizeCallDirection, parseOptionalDate } from '@server/calls'

const getFirstString = (...values) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim()
  )
  return value === undefined || value === null ? '' : String(value).trim()
}

const normalizeDate = (...values) => {
  const value = getFirstString(...values)
  if (!value) return null
  return parseOptionalDate(value.replace(' ', 'T')) ?? parseOptionalDate(value)
}

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const normalizeNovofonDirection = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (['in', 'incoming', 'входящий'].includes(normalized)) return 'incoming'
  if (['out', 'outgoing', 'исходящий'].includes(normalized)) return 'outgoing'
  return normalizeCallDirection(value)
}

export const getNovofonTenantId = (body, searchParams) =>
  getFirstString(
    body?.tenantId,
    body?.tenant_id,
    body?.crm_tenant_id,
    searchParams?.get('tenantId'),
    searchParams?.get('tenant_id')
  )

export const getNovofonWebhookSecret = (req, body, searchParams) =>
  getFirstString(
    req.headers.get('x-novofon-secret'),
    req.headers.get('x-telephony-secret'),
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, ''),
    body?.secret,
    body?.token,
    body?.webhook_secret,
    searchParams?.get('secret'),
    searchParams?.get('token')
  )

export const isValidTenantId = (tenantId) =>
  Boolean(tenantId && mongoose.Types.ObjectId.isValid(String(tenantId)))

export const getNovofonSettings = async (tenantId) => {
  if (!isValidTenantId(tenantId)) return null
  const siteSettings = await SiteSettings.findOne({ tenantId }).lean()
  const custom = siteSettings?.custom ?? {}
  const getValue = (key) =>
    typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

  return {
    enabled: getValue('novofonEnabled') === true,
    webhookSecret: getFirstString(getValue('novofonWebhookSecret')),
    apiKey: getFirstString(getValue('novofonApiKey')),
  }
}

export const normalizeNovofonWebhook = (body = {}) => {
  const direction = normalizeNovofonDirection(
    getFirstString(body.direction, body.call_direction, body.call_type)
  )
  const event = getFirstString(body.event, body.event_type, body.type)
  const providerCallId = getFirstString(
    body.call_id,
    body.call_session_id,
    body.session_id,
    body.talk_id,
    body.pbx_call_id,
    body.id
  )
  const incomingPhone = getFirstString(
    body.caller_id,
    body.caller,
    body.src,
    body.from,
    body.client_phone,
    body.phone
  )
  const outgoingPhone = getFirstString(
    body.called_did,
    body.called,
    body.dst,
    body.to,
    body.destination,
    body.phone
  )
  const phone =
    direction === 'outgoing'
      ? outgoingPhone || incomingPhone
      : incomingPhone || outgoingPhone
  const recordingUrl = getFirstString(
    body.file_link,
    body.record_file_link,
    body.recording_url,
    body.record_url,
    body.record_link
  )
  const startedAt = normalizeDate(
    body.start_time,
    body.started_at,
    body.call_start,
    body.created_at,
    body.date
  )
  const endedAt = normalizeDate(
    body.finish_time,
    body.end_time,
    body.ended_at,
    body.call_end
  )
  const durationSec = normalizeNumber(
    getFirstString(body.duration, body.duration_sec, body.billsec),
    0
  )

  return {
    provider: 'novofon',
    providerCallId,
    direction,
    phone,
    startedAt,
    endedAt,
    durationSec,
    status: body.transcript ? 'ready' : 'new',
    recordingUrl,
    transcript: getFirstString(body.transcript, body.speech_text, body.text),
    processingError: '',
    rawEvent: event,
  }
}
