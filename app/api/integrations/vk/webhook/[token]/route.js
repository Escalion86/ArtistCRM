import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import SiteSettings from '@models/SiteSettings'
import {
  createOrUpdateVkLead,
  normalizeVkSettings,
  updateVkCustom,
} from '@server/vkGroup'
import { isTenantIntegrationAllowed } from '@server/integrationAccess'
import { checkRateLimit, rateLimitResponse } from '@server/rateLimit'

const parseWebhookBody = async (req) => {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return req.json().catch(() => ({}))
  }
  const text = await req.text().catch(() => '')
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    return { text }
  }
}

const jsonError = (message, status = 400, code = 'vk_error') =>
  NextResponse.json(
    { success: false, error: { code, type: 'vk_group', message } },
    { status }
  )

export const POST = async (req, { params }) => {
  const routeParams = await params
  const token = String(routeParams?.token || '').trim()
  if (!token) return jsonError('Token required', 400, 'missing_token')

  const limit = await checkRateLimit({
    req,
    scope: 'vk_group_webhook',
    limit: 300,
    windowMs: 10 * 60 * 1000,
    keyParts: [token],
  })
  if (!limit.ok) return rateLimitResponse(NextResponse, limit)

  const body = await parseWebhookBody(req)
  await dbConnect()

  const siteSettings = await SiteSettings.findOne({
    'custom.vkGroupWebhookToken': token,
  })
  if (!siteSettings?.tenantId) return jsonError('Forbidden', 403, 'forbidden')

  const vkGroup = normalizeVkSettings(siteSettings.custom)
  if (vkGroup.groupId && String(body?.group_id || '') !== vkGroup.groupId) {
    return jsonError('Forbidden', 403, 'bad_group')
  }

  const tariffAllowed = await isTenantIntegrationAllowed(
    siteSettings.tenantId,
    'vk'
  )
  if (!tariffAllowed) {
    return jsonError(
      'VK integration is not available on current tariff',
      403,
      'tariff_required'
    )
  }

  if (body?.type === 'confirmation') {
    return new NextResponse(vkGroup.confirmationCode || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!vkGroup.enabled) {
    return jsonError('VK integration is disabled', 403, 'disabled')
  }

  if (vkGroup.webhookSecret && body?.secret !== vkGroup.webhookSecret) {
    return jsonError('Forbidden', 403, 'bad_secret')
  }

  if (body?.type !== 'message_new') {
    return new NextResponse('ok', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const result = await createOrUpdateVkLead({
    tenantId: siteSettings.tenantId,
    siteSettings,
    body,
  })

  if (!result.ok) {
    return jsonError('Invalid VK payload', result.status || 400, result.error)
  }

  await updateVkCustom({
    tenantId: siteSettings.tenantId,
    patch: {
      vkGroupLastWebhookAt: new Date().toISOString(),
      vkGroupLastPeerId: result.normalized?.vkPeerId || '',
      vkGroupLastError: '',
    },
  })

  return new NextResponse('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
