import { NextResponse } from 'next/server'
import SiteSettings from '@models/SiteSettings'
import TelegramMessages from '@models/TelegramMessages'
import dbConnect from '@server/dbConnect'
import { isTenantIntegrationAllowed } from '@server/integrationAccess'
import { checkRateLimit, rateLimitResponse } from '@server/rateLimit'
import {
  normalizeTelegramSettings,
  saveTelegramBusinessMessage,
  updateTelegramCustom,
} from '@server/telegramBusiness'

const jsonError = (message, status = 400, code = 'telegram_error') =>
  NextResponse.json(
    { success: false, error: { code, type: 'telegram_business', message } },
    { status }
  )

export const POST = async (req, { params }) => {
  const routeParams = await params
  const token = String(routeParams?.token || '').trim()
  if (!token) return jsonError('Token required', 400, 'missing_token')

  const limit = await checkRateLimit({
    req,
    scope: 'telegram_business_webhook',
    limit: 500,
    windowMs: 10 * 60 * 1000,
    keyParts: [token],
  })
  if (!limit.ok) return rateLimitResponse(NextResponse, limit)

  await dbConnect()
  const siteSettings = await SiteSettings.findOne({
    'custom.telegramBusinessWebhookToken': token,
  })
  if (!siteSettings?.tenantId) return jsonError('Forbidden', 403, 'forbidden')

  const settings = normalizeTelegramSettings(siteSettings.custom)
  const requestSecret = String(
    req.headers.get('x-telegram-bot-api-secret-token') || ''
  )
  if (!settings.webhookSecret || requestSecret !== settings.webhookSecret) {
    return jsonError('Forbidden', 403, 'bad_secret')
  }
  if (!settings.enabled) return jsonError('Integration disabled', 403, 'disabled')

  const tariffAllowed = await isTenantIntegrationAllowed(
    siteSettings.tenantId,
    'telegram'
  )
  if (!tariffAllowed) {
    return jsonError('Telegram integration is unavailable', 403, 'tariff_required')
  }

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()
  const connection = body?.business_connection
  if (connection) {
    await updateTelegramCustom({
      tenantId: siteSettings.tenantId,
      patch: {
        telegramBusinessConnectionId: connection?.is_enabled
          ? String(connection.id || '')
          : '',
        telegramBusinessAccountUserId: connection?.is_enabled
          ? String(connection?.user?.id || '')
          : '',
        telegramBusinessRights: connection?.rights || null,
        telegramBusinessStatus: connection?.is_enabled
          ? 'connected'
          : 'bot_ready',
        telegramBusinessConnectedAt: connection?.is_enabled ? now : null,
        telegramBusinessLastWebhookAt: now,
        telegramBusinessLastError: '',
      },
    })
    return NextResponse.json({ ok: true })
  }

  const message = body?.business_message || body?.edited_business_message
  if (message) {
    const effectiveSettings = {
      ...settings,
      businessConnectionId:
        settings.businessConnectionId || message.business_connection_id,
    }
    const result = await saveTelegramBusinessMessage({
      tenantId: siteSettings.tenantId,
      settings: effectiveSettings,
      message,
    })
    await updateTelegramCustom({
      tenantId: siteSettings.tenantId,
      patch: {
        telegramBusinessConnectionId: String(
          message.business_connection_id || settings.businessConnectionId || ''
        ),
        telegramBusinessStatus: 'connected',
        telegramBusinessLastWebhookAt: now,
        telegramBusinessLastMessageAt: result ? now : settings.lastMessageAt,
        telegramBusinessLastError: '',
      },
    })
    return NextResponse.json({ ok: true })
  }

  const deleted = body?.deleted_business_messages
  if (deleted?.chat?.id && Array.isArray(deleted?.message_ids)) {
    await TelegramMessages.deleteMany({
      tenantId: siteSettings.tenantId,
      telegramChatId: String(deleted.chat.id),
      telegramMessageId: { $in: deleted.message_ids.map(String) },
    })
  }
  await updateTelegramCustom({
    tenantId: siteSettings.tenantId,
    patch: { telegramBusinessLastWebhookAt: now },
  })
  return NextResponse.json({ ok: true })
}
