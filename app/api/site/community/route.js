import { NextResponse } from 'next/server'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import {
  getTelegramCommunityUrlError,
  normalizeTelegramCommunityUrl,
} from '@helpers/onboardingCommunity.mjs'

const jsonError = (message, status, code) =>
  NextResponse.json(
    { success: false, error: { code, type: 'community_settings', message } },
    { status }
  )

const canManageCommunity = (user) =>
  user?.role === 'dev' && user?.impersonation?.active !== true

export const GET = async () => {
  const { user, tenantId } = await getTenantContext()
  if (!user?._id || !tenantId) {
    return jsonError('Не авторизован', 401, 'unauthorized')
  }

  await dbConnect()
  const settings = await SiteSettings.findOne({ tenantId: null })
    .select('headerInfo.memberChatLink')
    .lean()

  return NextResponse.json({
    success: true,
    data: {
      telegramUrl: normalizeTelegramCommunityUrl(
        settings?.headerInfo?.memberChatLink
      ),
    },
  })
}

export const POST = async (req) => {
  const { user } = await getTenantContext()
  if (!canManageCommunity(user)) {
    return jsonError('Нет доступа', 403, 'forbidden')
  }

  const body = await req.json().catch(() => ({}))
  const rawTelegramUrl = String(body?.telegramUrl ?? '').trim()
  const telegramUrl = normalizeTelegramCommunityUrl(rawTelegramUrl)

  if (rawTelegramUrl && !telegramUrl) {
    return jsonError(
      getTelegramCommunityUrlError(rawTelegramUrl),
      400,
      'invalid_telegram_url'
    )
  }

  await dbConnect()
  await SiteSettings.findOneAndUpdate(
    { tenantId: null },
    {
      $set: {
        tenantId: null,
        'headerInfo.memberChatLink': telegramUrl || null,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )

  return NextResponse.json({
    success: true,
    data: { telegramUrl },
  })
}
