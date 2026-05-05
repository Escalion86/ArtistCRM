import { NextResponse } from 'next/server'
import Calls from '@models/Calls'
import dbConnect from '@server/dbConnect'
import { normalizeCallInput } from '@server/calls'
import { isTelephonyTariffAllowedForTenant } from '@server/telephonyAccess'
import {
  getNovofonSettings,
  getNovofonTenantId,
  getNovofonWebhookSecret,
  isValidTenantId,
  normalizeNovofonWebhook,
} from '@server/novofon'

const buildNovofonUpdate = (payload, normalized, tenantId) => {
  const update = {
    ...payload,
    tenantId,
    status: payload.transcript ? 'ready' : payload.status,
  }

  if (!normalized.phone) {
    delete update.phone
    delete update.normalizedPhone
    delete update.linkedClientId
  }
  if (!normalized.startedAt) delete update.startedAt
  if (!normalized.endedAt) delete update.endedAt
  if (!normalized.durationSec) delete update.durationSec
  if (!normalized.direction || normalized.direction === 'unknown') {
    delete update.direction
  }

  return update
}

const parseWebhookBody = async (req) => {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return req.json().catch(() => ({}))
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await req.formData().catch(() => null)
    if (!formData) return {}
    return Object.fromEntries(formData.entries())
  }
  return req.json().catch(() => ({}))
}

export const POST = async (req) => {
  const body = await parseWebhookBody(req)
  const { searchParams } = new URL(req.url)
  const tenantId = getNovofonTenantId(body, searchParams)
  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      { success: false, error: 'valid tenantId is required' },
      { status: 400 }
    )
  }

  await dbConnect()
  const settings = await getNovofonSettings(tenantId)
  const fallbackSecret =
    process.env.NOVOFON_WEBHOOK_SECRET || process.env.TELEPHONY_WEBHOOK_SECRET
  const expectedSecret = settings?.webhookSecret || fallbackSecret

  if (!settings?.enabled && !fallbackSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Novofon integration is disabled for this tenant',
      },
      { status: 403 }
    )
  }

  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'Novofon webhook is not configured' },
      { status: 503 }
    )
  }

  if (getNovofonWebhookSecret(req, body, searchParams) !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const hasTariffAccess = await isTelephonyTariffAllowedForTenant(tenantId)
  if (!hasTariffAccess) {
    return NextResponse.json(
      {
        success: false,
        error: 'Novofon integration is available only with telephony tariff option',
      },
      { status: 403 }
    )
  }

  const normalized = normalizeNovofonWebhook(body)
  const payload = await normalizeCallInput(normalized, tenantId)
  const update = buildNovofonUpdate(payload, normalized, tenantId)

  let call = null
  if (payload.providerCallId) {
    call = await Calls.findOneAndUpdate(
      {
        tenantId,
        provider: 'novofon',
        providerCallId: payload.providerCallId,
      },
      update,
      { upsert: true, returnDocument: 'after' }
    ).lean()
  } else {
    call = await Calls.create(update)
  }

  return NextResponse.json({ success: true, data: call }, { status: 200 })
}
